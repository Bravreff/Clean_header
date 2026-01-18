// Email Header Cleaner Application

let rawHeadersInput;
let cleanedHeadersOutput;
let processBtn;
let copyBtn;
let clearInputBtn;
let themeToggle;

// Option checkboxes
let replaceDomains;
let replaceDate;
let replaceTo;
let replaceMessageId;
let removeReceived;
let removeReplyTo;
let addCC;
let removeTracking;
let replaceSubject;

// Option inputs
let domainPlaceholder;
let messageIdTag;
let subjectTag;

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", initializeApp);

function initializeApp() {
  // Get DOM elements
  rawHeadersInput = document.getElementById("rawHeaders");
  cleanedHeadersOutput = document.getElementById("cleanedHeaders");
  processBtn = document.getElementById("processBtn");
  copyBtn = document.getElementById("copyBtn");
  clearInputBtn = document.getElementById("clearInput");
  themeToggle = document.getElementById("themeToggle");

  // Option checkboxes
  replaceDomains = document.getElementById("replaceDomains");
  replaceDate = document.getElementById("replaceDate");
  replaceTo = document.getElementById("replaceTo");
  replaceMessageId = document.getElementById("replaceMessageId");
  removeReceived = document.getElementById("removeReceived");
  removeReplyTo = document.getElementById("removeReplyTo");
  addCC = document.getElementById("addCC");
  removeTracking = document.getElementById("removeTracking");
  replaceSubject = document.getElementById("replaceSubject");

  // Option inputs
  domainPlaceholder = document.getElementById("domainPlaceholder");
  messageIdTag = document.getElementById("messageIdTag");
  subjectTag = document.getElementById("subjectTag");

  // Initialize theme
  initializeTheme();

  // Process headers when button is clicked
  if (processBtn) {
    processBtn.addEventListener("click", processHeaders);
  }

  // Copy functionality
  if (copyBtn) {
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
  }

  // Clear input
  if (clearInputBtn) {
    clearInputBtn.addEventListener("click", () => {
      rawHeadersInput.value = "";
      cleanedHeadersOutput.value = "";
      copyBtn.disabled = true;
    });
  }
}

// Theme Toggle Functionality
function initializeTheme() {
  const savedTheme = localStorage.getItem("theme") || "dark";
  document.body.classList.remove("light-mode", "dark-mode");
  document.body.classList.add(savedTheme + "-mode");
  updateThemeIcon(savedTheme);

  if (themeToggle) {
    themeToggle.addEventListener("click", toggleTheme);
  }
}

function toggleTheme() {
  const currentTheme = document.body.classList.contains("light-mode")
    ? "light"
    : "dark";
  const newTheme = currentTheme === "light" ? "dark" : "light";

  document.body.classList.remove(currentTheme + "-mode");
  document.body.classList.add(newTheme + "-mode");

  localStorage.setItem("theme", newTheme);
  updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
  if (themeToggle) {
    const iconSpan = themeToggle.querySelector(".theme-icon");
    if (iconSpan) {
      iconSpan.textContent = theme === "light" ? "🌙" : "☀️";
    }
  }
}

function processHeaders() {
  try {
    console.log("Processing headers started...");
    
    if (
      !rawHeadersInput ||
      !cleanedHeadersOutput ||
      !processBtn ||
      !copyBtn ||
      !domainPlaceholder
    ) {
      console.error("Required DOM elements not found");
      console.log("rawHeadersInput:", rawHeadersInput);
      console.log("cleanedHeadersOutput:", cleanedHeadersOutput);
      console.log("processBtn:", processBtn);
      console.log("copyBtn:", copyBtn);
      console.log("domainPlaceholder:", domainPlaceholder);
      alert("Error: Application initialization failed. Please refresh the page.");
      return;
    }

    const rawText = rawHeadersInput.value.trim();
    console.log("Raw text length:", rawText.length);
    
    const placeholder = domainPlaceholder.value || "__Bounce_dn";
    console.log("Placeholder:", placeholder);

    if (!rawText) {
      cleanedHeadersOutput.value = "";
      copyBtn.disabled = true;
      return;
    }

    console.log("Parsing headers...");
    let headers = parseHeaders(rawText);
    console.log("Parsed headers count:", headers.length);

    console.log("Normalizing from...");
    headers = normalizeFrom(headers, placeholder);

    // Apply transformations
    if (replaceDomains && replaceDomains.checked) {
      console.log("Replacing domains...");
      headers = replaceAllDomains(headers, placeholder);
    }

    if (replaceDate && replaceDate.checked) {
      console.log("Replacing date...");
      headers = replaceHeader(headers, "Date", "__smtpDate");
    }

    if (replaceTo && replaceTo.checked) {
      console.log("Replacing to...");
      headers = replaceHeader(headers, "To", "__To");
    }

    if (replaceMessageId && replaceMessageId.checked) {
      console.log("Replacing message ID...");
      const messageIdValue = (messageIdTag && messageIdTag.value.trim()) || "__Uniqid";
      headers = replaceHeader(
        headers,
        "Message-ID",
        "<" + messageIdValue + "@" + placeholder + ">",
      );
    }

    // Note: These are now "Keep" checkboxes - if NOT checked, remove the headers
    if (removeReceived && !removeReceived.checked) {
      console.log("Removing received...");
      headers = removeHeaders(headers, "Received");
    }

    if (removeReplyTo && !removeReplyTo.checked) {
      console.log("Removing reply-to...");
      headers = removeHeaders(headers, "Reply-To");
    }

    if (addCC && addCC.checked) {
      console.log("Adding/replacing CC...");
      const ccVal = "__To";
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

    if (removeTracking && removeTracking.checked) {
      console.log("Removing tracking headers...");
      headers = removeHeaders(headers, "X-Originating-IP");
      headers = removeHeaders(headers, "X-Mailer");
      headers = removeHeaders(headers, "X-Priority");
      headers = removeHeaders(headers, "X-MSMail-Priority");
      headers = removeHeaders(headers, "X-MimeOLE");
      headers = removeHeaders(headers, "Feedback-ID");
      headers = removeHeaders(headers, "X-SES-Outgoing");
      headers = removeHeaders(headers, "X-Freeprint");
    }

    if (replaceSubject && replaceSubject.checked) {
      console.log("Replacing subject...");
      const subjectValue = (subjectTag && subjectTag.value.trim()) || "__Subject.__Server.__Ip";
      headers = replaceHeader(headers, "Subject", subjectValue);
    }

    // Output cleaned headers
    console.log("Formatting headers...");
    let cleanedText = formatHeaders(headers);

    // Final safety net - remove orphan date lines
    cleanedText = removeOrphanDates(cleanedText);

    console.log("Cleaned text length:", cleanedText.length);
    
    cleanedHeadersOutput.value = cleanedText;
    copyBtn.disabled = !cleanedText;
    console.log("Processing complete!");
  } catch (error) {
    console.error("Error processing headers:", error);
    console.error("Error stack:", error.stack);
    alert("An error occurred while processing headers. Check the console for details.\n\nError: " + error.message);
  }
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
      value = value.replace(/<[^>]+>/g, `<noreply@${placeholder}>`);

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
    (header) => header.name.toLowerCase() !== headerName.toLowerCase(),
  );
}

function addHeaderIfMissing(headers, headerName, value) {
  const exists = headers.some(
    (h) => h.name.toLowerCase() === headerName.toLowerCase(),
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

function removeOrphanDates(text) {
  // Flexible regex to match various email date formats:
  // - Optional day name (Mon, Monday, etc.)
  // - Day number (1-31)
  // - Month name (Jan, January, etc.)
  // - Year (2 or 4 digits)
  // - Time (HH:MM or HH:MM:SS)
  // - Optional timezone (+0000, -0500, GMT, UTC, etc.)
  const dateRegex = /^(?:[A-Za-z]{3,9},?\s+)?\d{1,2}[\s\-\/]+[A-Za-z]{3,9}[\s\-\/]+\d{2,4}\s+\d{1,2}:\d{2}(?::\d{2})?(?:\s*[+-]?\d{2,4}|\s*[A-Za-z]{2,5})?$/;
  
  return text
    .split("\n")
    .filter((line) => !dateRegex.test(line.trim()))
    .join("\n");
}
function removeOrphanDates(text) {
  return text
    .split("\n")
    .filter(
      (line) =>
        !/^[A-Za-z]{3}, \d{1,2} [A-Za-z]{3} \d{4} \d{2}:\s?\d{2}:\d{2}/.test(
          line.trim()
        )
    )
    .join("\n");
}
