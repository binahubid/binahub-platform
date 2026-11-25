export const consultantAgreementDate = '[[AMS_ACCEPTANCE_DATE]]';
export const consultantAgreementSignature = '[[AMS_CONSULTANT_SIGNATURE]]';

type AgreementParties = {
  associateId: string;
  revision: number;
  name: string;
  email: string;
  address: string;
  identityNumber: string;
  npwp?: string;
  bankName: string;
  bankHolder: string;
  bankAccount: string;
  signerName: string;
  signerTitle: string;
  companyDate: string;
};

export function renderConsultantAgreements(parties: AgreementParties, templates: { nda: string; aca: string }) {
  const { associateId, revision, ...fields } = parties;
  const documentNumber = associateId.replaceAll('-', '').toUpperCase() + '/' + (revision + 1);
  return (['nda', 'aca'] as const).map((kind) => {
    const template = templates[kind];
    const replacements: Record<string, string> = {
      ...fields,
      npwp: fields.npwp || 'Tidak dicantumkan',
      number: 'BH/' + kind.toUpperCase() + '/' + documentNumber,
      acceptanceDate: consultantAgreementDate,
      companySignature: 'Disetujui untuk BinaHub melalui AMS oleh ' + fields.signerName,
      consultantSignature: consultantAgreementSignature,
    };
    return template.replace(/{{([A-Za-z]+)}}/g, (_token, key: string) => {
      const value = replacements[key];
      if (!value) throw new Error('TEAM_AGREEMENT_REQUIRED');
      return value;
    });
  });
}

export function activeConsultantMembership(membership: { status: string; accepted_at: string | null } | null, associateStatus: string) {
  return !!membership && membership.status === 'active' && !!membership.accepted_at && associateStatus === 'active';
}
