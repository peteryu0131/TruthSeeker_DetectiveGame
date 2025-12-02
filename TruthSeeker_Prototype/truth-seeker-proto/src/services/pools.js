const POOLS_PATH = '/pools.json';

export async function loadPools() {
  const response = await fetch(POOLS_PATH);
  if (!response.ok) {
    throw new Error(`Failed to load data pool: ${POOLS_PATH}`);
  }
  return response.json();
}
