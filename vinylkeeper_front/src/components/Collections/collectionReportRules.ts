interface ReportableCollection {
  isLoggedIn: boolean;
  currentUserUuid: string | null | undefined;
  ownerUuid: string | null | undefined;
  isPublic: boolean;
}

/**
 * "Report abuse" is offered to a logged-in member on a public collection of someone else only. Two
 * unknown ids never read as the same person: without both, nobody is taken for the owner.
 */
export function canReportCollection({ isLoggedIn, currentUserUuid, ownerUuid, isPublic }: ReportableCollection): boolean {
  if (!isLoggedIn || !currentUserUuid || !isPublic) return false;
  return currentUserUuid !== ownerUuid;
}
