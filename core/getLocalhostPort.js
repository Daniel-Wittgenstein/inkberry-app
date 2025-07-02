const portsToTry = [1313, 1312, 1315, 1316, 1317, 1318, 1319, 3000];

const FINAL_FALLBACK = 8080;

function getLocalHostPort(attemptCount) {
  return portsToTry[attemptCount] || FINAL_FALLBACK;
}

module.exports = getLocalHostPort;
