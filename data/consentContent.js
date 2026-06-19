/**
 * Consent modal content.
 *
 * TODO: Requires PI review and approval
 *
 * IMPORTANT: bump CONSENT_VERSION in constants.js whenever the wording
 * is materially revised, so that records in REDCap carry accurate
 * provenance of which consent text the participant saw.
 */

export const consentContent = {
  title: 'Before you begin',

  // Tier 1: screening-tool acknowledgment (required to proceed).
  acknowledgment: {
    heading: 'About this tool',
    body: [
      'This tool helps screen for symptoms consistent with Carpal Tunnel Syndrome (CTS). It is not a medical diagnosis.',
      'Your results should be discussed with a qualified healthcare provider, who can confirm the diagnosis and recommend treatment.',
      'If you have concerns about your symptoms, please consult a clinician.',
    ],
    checkboxLabel:
      'I understand this is a screening tool and not a medical diagnosis.',
  },

  // Tier 2: research data-sharing consent (optional).
  dataSharing: {
    heading: 'Data Collection Agreement for Research',
    body: [
      'We are studying how well this tool identifies CTS symptoms. With your permission, your anonymized responses will be sent to a secure research database managed by the Roth | McFarlane Hand and Upper Limb Centre at St. Joseph\'s Health Care London.',
      'No personally identifying information is collected.',
    ],
    checkboxLabel:
      'I agree to share my anonymized responses for research.',
  },

  buttons: {
    proceed: 'Continue',
    declineAll: 'Exit',
  },
};