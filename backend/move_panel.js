const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../frontend/src/pages/LeadDetail.jsx');
let content = fs.readFileSync(file, 'utf8');

// The marker for the start of the panel
const startMarker = "          {/* Activity Logger */}";
const endMarker = "        </div>\n\n        {/* RIGHT COLUMN: AI & Timeline */}";

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex === -1 || endIndex === -1) {
  console.log("Could not find markers", startIndex, endIndex);
  process.exit(1);
}

const panelChunk = content.substring(startIndex, endIndex);

// Remove the panel from its original position
content = content.substring(0, startIndex) + content.substring(endIndex);

// Find where to insert it: below the Activity Timeline
const insertMarker = "          </div>\n\n        </div>\n      </div>";
const insertIndex = content.indexOf(insertMarker);

if (insertIndex === -1) {
  console.log("Could not find insert marker");
  process.exit(1);
}

// Insert it
content = content.substring(0, insertIndex) + "          " + panelChunk.trim() + "\n\n" + content.substring(insertIndex);

fs.writeFileSync(file, content);
console.log("Moved successfully.");
