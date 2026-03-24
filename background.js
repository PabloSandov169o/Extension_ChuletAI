chrome.commands.onCommand.addListener((command) => {
  if (command === "toggle-extension") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs || !tabs[0] || !tabs[0].id) return;
      chrome.tabs.sendMessage(tabs[0].id, { action: "toggle" }, () => {
        if (chrome.runtime.lastError) {
          console.log("El script de contenido no está inyectado.");
        }
      });
    });
  }
});