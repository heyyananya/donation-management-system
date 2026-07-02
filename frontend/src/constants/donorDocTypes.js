export const DOC_TYPES = [
  { value: 'pan', label: 'PAN' },
  { value: 'aadhaar', label: 'Aadhaar' },
  { value: 'voterId', label: 'Voter ID' },
  { value: 'passport', label: 'Passport' },
  { value: 'other', label: 'Other' },
];

export const docTypeLabel = (type) => DOC_TYPES.find((d) => d.value === type)?.label || type;
