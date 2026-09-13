/**
 * Formats internal or technical notification titles and messages into student-friendly, human-readable text.
 */
export interface FormattedNotification {
  friendlyTitle: string;
  friendlyMessage: string;
  badgeLabel: string;
}

export function formatNotificationForStudent(type: string, title: string, message: string, category: string): FormattedNotification {
  let friendlyTitle = title;
  let friendlyMessage = message;
  let badgeLabel = category;

  // Standardize titles
  if (type === 'REPORT_STATUS_CHANGE') {
    friendlyTitle = 'Issue Status Update';
    if (message.includes('ASSIGNED')) {
      friendlyMessage = 'Your reported issue has been assigned to the maintenance team.';
    } else if (message.includes('IN_PROGRESS')) {
      friendlyMessage = 'Maintenance work is currently in progress for your reported issue.';
    } else if (message.includes('RESOLVED')) {
      friendlyMessage = 'Great news! Your reported issue has been resolved by campus operations.';
    } else if (message.includes('VERIFIED')) {
      friendlyMessage = 'Your report has been verified by university administration.';
    } else if (message.includes('REJECTED')) {
      friendlyMessage = 'Your report was reviewed by administrators and could not be verified.';
    }
  } else if (type === 'REPORT_VERIFIED') {
    friendlyTitle = 'Report Verified';
    friendlyMessage = 'Your report has been verified by the campus administration team.';
  } else if (type === 'MASTER_ISSUE_MERGED' || message.includes('Merged into')) {
    friendlyTitle = 'Issue Merged';
    friendlyMessage = 'Your report was combined with an existing campus issue.';
  } else if (type === 'SUPER_ADMIN_ANNOUNCEMENT') {
    friendlyTitle = 'Campus Announcement';
    friendlyMessage = message.replace(/^\[Platform Announcement\]\s*/i, '');
    badgeLabel = 'ANNOUNCEMENT';
  } else if (type === 'POINTS_AWARDED' || category === 'REWARD') {
    friendlyTitle = 'Contribution Reward';
    badgeLabel = 'REWARD';
  }

  // Clean up technical artifacts if any remain
  friendlyMessage = friendlyMessage
    .replace(/ISSUE_STATUS_TRANSITION event generated/g, 'Issue status updated')
    .replace(/REPORT_VERIFIED/g, 'Report verified')
    .replace(/MASTER_ISSUE_MERGED/g, 'Issue combined with existing report');

  return {
    friendlyTitle,
    friendlyMessage,
    badgeLabel
  };
}
