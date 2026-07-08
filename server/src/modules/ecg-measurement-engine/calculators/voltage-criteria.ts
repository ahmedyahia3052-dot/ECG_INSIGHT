/** LVH / RVH / low voltage criteria. */

export function evaluateVoltageCriteria(input: {
  limbLeadPeakMv: number[];
  qrsAmplitudeMv: number;
  v1MinMv: number;
  v1PeakMv: number;
  v5PeakMv: number;
  v6PeakMv: number;
}) {
  const sV1 = Math.abs(input.v1MinMv);
  const maxPrecordialR = Math.max(input.v5PeakMv, input.v6PeakMv);
  const lvhVoltageCriteria = sV1 + maxPrecordialR > 3.5;
  const rvhVoltageCriteria = input.v1PeakMv > 0.7;
  const lowVoltageLimbLeads = input.limbLeadPeakMv.every((peak) => peak < 0.5);
  const voltageMv = lowVoltageLimbLeads ? 0.3 : input.qrsAmplitudeMv;
  return { lowVoltageLimbLeads, lvhVoltageCriteria, rvhVoltageCriteria, voltageMv };
}
