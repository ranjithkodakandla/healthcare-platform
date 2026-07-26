export class CompleteStageDto {
  reviewerId!: string;
  notes?: string;
  /** Required when completing CREDENTIAL_VERIFICATION — reviewer confirms checklist. */
  checklistComplete?: boolean;
}
