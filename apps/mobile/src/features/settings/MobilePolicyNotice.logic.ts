import { ISNADI_PRIVACY_POLICY_VERSION, ISNADI_TERMS_VERSION } from "@isnadi/contracts/settings";

export function needsMobilePolicyAcknowledgement(preferences: {
  readonly reviewedPrivacyPolicyVersion?: string;
  readonly reviewedTermsVersion?: string;
}): boolean {
  return (
    preferences.reviewedPrivacyPolicyVersion !== ISNADI_PRIVACY_POLICY_VERSION ||
    preferences.reviewedTermsVersion !== ISNADI_TERMS_VERSION
  );
}

export function shouldShowMobilePolicyNotice(input: {
  readonly appVariant: string;
  readonly loaded: boolean;
  readonly needsAcknowledgement: boolean;
}): boolean {
  return input.loaded && input.appVariant !== "development" && input.needsAcknowledgement;
}
