const fs = require("node:fs/promises");
const path = require("node:path");

const DATA_FILE = path.join(__dirname, "data", "residents.json");

async function readResidents() {
  const contents = await fs.readFile(DATA_FILE, "utf8");
  const residents = JSON.parse(contents);
  if (!Array.isArray(residents)) {
    throw new Error("Resident storage must contain a JSON array.");
  }
  return residents;
}

let writeQueue = Promise.resolve();

function updateResidents(changeResidents) {
  const operation = writeQueue.then(async () => {
    const residents = await readResidents();
    const result = await changeResidents(residents);
    const temporaryFile = DATA_FILE + ".tmp";
    try {
      await fs.writeFile(temporaryFile, JSON.stringify(residents, null, 2), "utf8");
      await fs.rename(temporaryFile, DATA_FILE);
    } finally {
      await fs.rm(temporaryFile, { force: true });
    }
    return result;
  });
  writeQueue = operation.catch(() => {});
  return operation;
}

module.exports = { readResidents, updateResidents };
