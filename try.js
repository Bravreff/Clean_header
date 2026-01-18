// Email Header Cleaner Application

const rawHeadersInput = document.getElementById("rawHeaders");
const cleanedHeadersOutput = document.getElementById("cleanedHeaders");
const processBtn = document.getElementById("processBtn");
const copyBtn = document.getElementById("copyBtn");
const clearInputBtn = document.getElementById("clearInput");

// Option checkboxes
const replaceDomains = document.getElementById("replaceDomains");
const replaceDate = document.getElementById("replaceDate");
const replaceTo = document.getElementById("replaceTo");
const replaceMessageId = document.getElementById("replaceMessageId");
const removeReceived = document.getElementById("removeReceived");
const removeReplyTo = document.getElementById("removeReplyTo");
const replaceSubject = document.getElementById("replaceSubject");
const addCC = document.getElementById("addCC");

// Option inputs
const domainPlaceholder = document.getElementById("domainPlaceholder");
const messageIdPlaceholder = document.getElementById("messageIdPlaceholder");
const ccValue = document.getElementById("ccValue");
const domainResult = document.getElementById("domainResult");
const domainResultValue = document.getElementById("domainResultValue");
const ccResult = document.getElementById("ccResult");
const ccResultValue = document.getElementById("ccResultValue");

// Process headers when button is clicked
processBtn.addEventListener("click", processHeaders);

// Show domain placeholder value if not empty
domainPlaceholder.addEventListener("input", (event) => {
  const value = event.target.value.trim();
  if (value) {
    domainResultValue.textContent = value;
    domainResult.style.display = "block";
  } else {
    domainResult.style.display = "none";
  }
});

// Show CC value if not empty
ccValue.addEventListener("input", (event) => {
  const value = event.target.value.trim();
  if (value) {
    ccResultValue.textContent = value;
    ccResult.style.display = "block";
  } else {
    ccResult.style.display = "none";
  }
});

// Listen for changes to ccValue and update display
ccValue.addEventListener("change", (event) => {
  const value = event.target.value.trim();
  if (value) {
    ccResultValue.textContent = value;
    ccResult.style.display = "block";
  }
});

// Initialize on page load
window.addEventListener("load", () => {
  const initialDomainValue = domainPlaceholder.value.trim();
  if (initialDomainValue) {
    domainResultValue.textContent = initialDomainValue;
    domainResult.style.display = "block";
  }

  const initialCCValue = ccValue.value.trim();
  if (initialCCValue) {
    ccResultValue.textContent = initialCCValue;
    ccResult.style.display = "block";
  }
});

// Copy functionality
copyBtn.addEventListener("click", () => {
  const text = cleanedHeadersOutput.value;
  if (text) {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        const originalText = copyBtn.textContent;
        copyBtn.textContent = "Copied!";
        copyBtn.style.background = "#28a745";
        setTimeout(() => {
          copyBtn.textContent = originalText;
          copyBtn.style.background = "#6c757d";
        }, 2000);
      })
      .catch((err) => {
        console.error("Failed to copy:", err);
        alert("Failed to copy to clipboard");
      });
  }
});

// Clear input
clearInputBtn.addEventListener("click", () => {
  rawHeadersInput.value = "";
  cleanedHeadersOutput.value = "";
  copyBtn.disabled = true;
});

function processHeaders() {
  const rawText = rawHeadersInput.value.trim();
  const placeholder = domainPlaceholder.value || "__Bounce_dn";

  if (!rawText) {
    cleanedHeadersOutput.value = "";
    copyBtn.disabled = true;
    return;
  }

  let headers = parseHeaders(rawText);

  headers = normalizeFrom(headers, placeholder);

  // Apply transformations
  if (replaceDomains.checked) {
    headers = replaceAllDomains(headers, placeholder);
  }

  if (replaceDate.checked) {
    headers = replaceHeader(headers, "Date", "__smtpDate");
  }

  if (replaceTo.checked) {
    headers = replaceHeader(headers, "To", "__To");
  }

  if (replaceMessageId.checked) {
    const messageIdValue = messageIdPlaceholder.value || "__Uniqid.__Uniqid.__Uniqid";
    headers = replaceHeader(
      headers,
      "Message-ID",
      "<" + messageIdValue + "@" + placeholder + ">"
    );
  }

  if (removeReceived.checked) {
    headers = removeHeaders(headers, "Received");
  }

  if (removeReplyTo.checked) {
    headers = removeHeaders(headers, "Reply-To");
  }

  if (replaceSubject.checked) {
    headers = replaceHeader(headers, "Subject", "__Subject");
  }

  if (addCC.checked) {
    const ccVal = ccValue.value.trim() || "__To";
    // Replace CC if exists, or add if missing
    headers = headers.map((header) => {
      if (header.name.toLowerCase() === "cc") {
        return { name: header.name, value: ccVal };
      }
      return header;
    });
    // If CC doesn't exist, add it
    const ccExists = headers.some((h) => h.name.toLowerCase() === "cc");
    if (!ccExists) {
      headers = addHeaderIfMissing(headers, "CC", ccVal);
    }
  }

  // Output cleaned headers
  const cleanedText = formatHeaders(headers);
  cleanedHeadersOutput.value = cleanedText;
  copyBtn.disabled = !cleanedText;
}

function parseHeaders(text) {
  const lines = text.split(/\r?\n/);
  const headers = [];
  let currentHeader = null;

  for (let line of lines) {
    line = line.trim();
    if (!line) continue;

    // Check if this is a new header (starts with a header name followed by colon)
    const headerMatch = line.match(/^([^:]+):\s*(.+)$/);

    if (headerMatch) {
      // Save previous header if exists
      if (currentHeader) {
        headers.push(currentHeader);
      }
      // Start new header
      currentHeader = {
        name: headerMatch[1].trim(),
        value: headerMatch[2].trim(),
      };
    } else if (currentHeader) {
      // Continuation line (folded header)
      currentHeader.value += " " + line;
    }
  }

  // Don't forget the last header
  if (currentHeader) {
    headers.push(currentHeader);
  }

  return headers;
}

function formatHeaders(headers) {
  return headers.map((h) => `${h.name}: ${h.value}`).join("\n");
}

function normalizeFrom(headers, placeholder) {
  return headers.map((header) => {
    if (header.name.toLowerCase() === "from") {
      let value = header.value;

      // Replace any email inside <>
      value = value.replace(
        /<[^>]+>/g,
        `<noreply@${placeholder}>`
      );

      return { name: header.name, value };
    }
    return header;
  });
}


function replaceAllDomains(headers, placeholder) {
  // More comprehensive domain regex that handles various formats
  const domainRegex =
    /([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}/g;

  return headers.map((header) => {
    let value = header.value;

    // Replace domains in the value
    value = value.replace(domainRegex, (match) => {
      // Don't replace if it's already the placeholder
      if (match === placeholder) return match;
      return placeholder;
    });

    return {
      name: header.name,
      value: value,
    };
  });
}

function replaceHeader(headers, headerName, newValue) {
  return headers.map((header) => {
    if (header.name.toLowerCase() === headerName.toLowerCase()) {
      return { name: header.name, value: newValue };
    }
    return header;
  });
}

function removeHeaders(headers, headerName) {
  return headers.filter(
    (header) => header.name.toLowerCase() !== headerName.toLowerCase()
  );
}

function addHeaderIfMissing(headers, headerName, value) {
  const exists = headers.some(
    (h) => h.name.toLowerCase() === headerName.toLowerCase()
  );

  if (!exists) {
    // Add CC header after To header if it exists, otherwise at the end
    const toIndex = headers.findIndex((h) => h.name.toLowerCase() === "to");

    if (toIndex !== -1) {
      headers.splice(toIndex + 1, 0, { name: headerName, value });
    } else {
      headers.push({ name: headerName, value });
    }
  }

  return headers;
}
