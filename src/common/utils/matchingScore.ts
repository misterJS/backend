type MatchingInput = {
  startArea: string;
  destinationArea: string;
  vehicleType: string;
};

const normalizeText = (value: string): string => {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
};

const tokenize = (value: string): string[] => {
  return normalizeText(value)
    .split(" ")
    .filter((token) => token.length > 0);
};

const getTokenOverlapScore = (left: string, right: string): number => {
  const leftTokens = new Set(tokenize(left));
  const rightTokens = new Set(tokenize(right));

  if (leftTokens.size === 0 || rightTokens.size === 0) {
    return 0;
  }

  let intersection = 0;

  leftTokens.forEach((token) => {
    if (rightTokens.has(token)) {
      intersection += 1;
    }
  });

  const unionSize = new Set([...leftTokens, ...rightTokens]).size;
  return unionSize === 0 ? 0 : intersection / unionSize;
};

export const calculateSimilarityScore = (source: MatchingInput, candidate: MatchingInput): number => {
  const destinationScore = getTokenOverlapScore(source.destinationArea, candidate.destinationArea) * 50;
  const startScore = getTokenOverlapScore(source.startArea, candidate.startArea) * 30;
  const vehicleScore =
    normalizeText(source.vehicleType) === normalizeText(candidate.vehicleType) ? 20 : 0;

  return Math.round(destinationScore + startScore + vehicleScore);
};

export const matchingScoreUtils = {
  normalizeText,
  tokenize,
  getTokenOverlapScore,
  calculateSimilarityScore
};
