import { Injectable, Logger } from '@nestjs/common';
import { CaseService } from '../../core/case.service';
import { CitizenBedSearchService } from '../../citizen/citizen-bed-search.service';
import { BedInventoryService } from '../../modules/beds/bed-inventory.service';
import { PrismaService } from '../../prisma/prisma.service';
import { InboundMessage, MessagingChannelAdapter, SendResult } from './messaging-channel.adapter';
import { parseInboundIntent } from './inbound-intent.parser';
import { AuditService } from '../audit/audit.service';
import { maskPhone } from '../privacy/log-mask.util';
import { createHash } from 'crypto';

export interface HandleResult {
  intent: string;
  reply: string;
  send: SendResult;
  data?: Record<string, unknown>;
}

// Routes normalised inbound messages to the SAME services/DTOs as REST controllers (M14/L2).
@Injectable()
export class InboundMessageHandler {
  private readonly logger = new Logger(InboundMessageHandler.name);

  constructor(
    private readonly cases: CaseService,
    private readonly bedSearch: CitizenBedSearchService,
    private readonly bedInventory: BedInventoryService,
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async handle(msg: InboundMessage, adapter: MessagingChannelAdapter): Promise<HandleResult> {
    const intent = parseInboundIntent(msg.body);
    this.logger.debug(
      `Inbound ${msg.channel} from ${maskPhone(msg.from)}: intent=${intent.type}`,
    );

    let reply: string;
    let data: Record<string, unknown> | undefined;

    switch (intent.type) {
      case 'EMERGENCY_CASE': {
        // GT-10 guest path — deviceId derived from channel+phone (BR-06)
        const deviceId = `${msg.channel}:${msg.from}`;
        const phoneHash = createHash('sha256').update(msg.from).digest('hex').slice(0, 16);
        const kase = await this.cases.createGuestCase({
          deviceId,
          location: { source: msg.channel, contactRef: phoneHash },
          initialPayload: {
            source: `${msg.channel}_webhook`,
            triageHint: intent.triageHint ?? null,
            rawBody: msg.body,
          },
        });
        data = { caseId: kase.id, caseNumber: kase.caseNumber };
        reply =
          `Emergency case ${kase.caseNumber} created. ` +
          `An ambulance dispatch will follow. Reply STATUS ${kase.id.slice(0, 8)} for updates. ` +
          `Coordinator: reply HELP.`;
        break;
      }

      case 'BED_SEARCH': {
        const results = await this.bedSearch.searchBeds({
          category: intent.category,
          freshOnly: false,
        });
        data = { count: results.length };
        if (results.length === 0) {
          reply = 'No beds found matching your request. Reply AMBULANCE for emergency help.';
        } else {
          const top = results.slice(0, 3).map((r, i) => {
            const dist = r.distanceKm != null ? ` · ${r.distanceKm}km` : '';
            const name = r.hospitalName ?? r.hospitalId;
            return `${i + 1}. ${name}: ${r.availableCount} ${r.category}${dist} [${r.stalenessStatus}]`;
          });
          reply = `Nearest beds:\n${top.join('\n')}\nReply AMBULANCE for emergency.`;
        }
        break;
      }

      case 'BED_UPDATE': {
        // Same BedInventoryService.updateBedCounts as PUT /v1/providers/:id/beds (L2 parity).
        // WhatsApp Tier 1 only sends available counts — merge with existing occupied/total.
        const actor = `${msg.channel}:${msg.from}`;
        const existing = await this.bedInventory.getBedInventory(intent.hospitalId);
        const byCat = new Map(existing.map((r) => [r.category, r]));
        const fullUpdates = intent.updates.map((u) => {
          const prev = byCat.get(u.category);
          const availableCount = u.availableCount;
          const occupiedCount = prev?.occupiedCount ?? 0;
          const totalCount = Math.max(prev?.totalCount ?? 0, availableCount + occupiedCount);
          return { category: u.category, availableCount, occupiedCount, totalCount };
        });
        const rows = await this.bedInventory.updateBedCounts(
          intent.hospitalId,
          actor,
          fullUpdates,
        );
        data = { hospitalId: intent.hospitalId, updatedCount: rows.length };
        reply =
          `Updated ${rows.length} bed categor${rows.length === 1 ? 'y' : 'ies'} for ${intent.hospitalId}. ` +
          `Staleness timer reset (§13.1).`;
        break;
      }

      case 'CASE_STATUS': {
        if (!intent.caseId) {
          reply = 'Reply STATUS followed by your case id, e.g. STATUS abc12345';
          break;
        }
        const found = await this.prisma.case.findFirst({
          where: {
            OR: [
              { id: { startsWith: intent.caseId } },
              { caseNumber: { contains: intent.caseId, mode: 'insensitive' } },
            ],
          },
        });
        if (found) {
          data = { caseId: found.id, status: found.status, caseNumber: found.caseNumber };
          reply = `Case ${found.caseNumber}: status ${found.status}.`;
        } else {
          reply = `No case found for "${intent.caseId}". Reply HELP for options.`;
        }
        break;
      }

      case 'HELP':
        reply =
          msg.channel === 'ivr'
            ? 'Press 1 for ambulance, 2 for bed search, 3 for case status, 0 for help.'
            : 'Sahayak commands:\n• AMBULANCE — create emergency case\n• BEDS / ICU — search beds\n• STATUS <id> — case status\n• HOSP <hospitalId> ICU 2 — provider bed update';
        break;

      default:
        reply =
          msg.channel === 'ivr'
            ? 'Invalid option. Press 0 for help.'
            : `I didn't understand "${msg.body.slice(0, 40)}". Reply HELP for commands.`;
    }

    await this.audit.record({
      actor: `${msg.channel}:${msg.from}`,
      action: 'MESSAGING_INBOUND_HANDLED',
      entityType: 'MessagingChannel',
      entityId: msg.externalId ?? msg.from,
      metadata: { channel: msg.channel, intent: intent.type, bodyPreview: msg.body.slice(0, 80) },
    });

    const send = await adapter.send({ channel: msg.channel, to: msg.from, body: reply });
    return { intent: intent.type, reply, send, data };
  }
}
