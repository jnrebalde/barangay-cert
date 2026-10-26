const fs = require("node:fs/promises");
const path = require("node:path");

const DATA_FILE = path.join(__dirname, "..", "data", "requests.json");

async function readRequests() {
  const contents = await fs.readFile(DATA_FILE, "utf8");
  const requests = JSON.parse(contents);

  if (!Array.isArray(requests)) {
    throw new Error("Request storage must contain a JSON array.");
  }

  return requests;
}

let writeQueue = Promise.resolve();

function updateRequests(changeRequests) {
  const operation = writeQueue.then(async () => {
    const requests = await readRequests();
    const result = await changeRequests(requests);
    const temporaryFile = DATA_FILE + ".tmp";

    try {
      await fs.writeFile(
        temporaryFile,
        JSON.stringify(requests, null, 2),
        "utf8"
      );

      await fs.rename(temporaryFile, DATA_FILE);
    } finally {
      await fs.rm(temporaryFile, { force: true });
    }

    return result;
  });

  writeQueue = operation.catch(() => {});
  return operation;
}

module.exports = { readRequests, updateRequests };