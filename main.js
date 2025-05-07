// Fetches HTML components and injects them into the page. Then sets active nav link based on the current URL.

// Fetching components and rendering them
const components = {
  navigation: "components/nav-component.html",
  infoDisplayText: "components/info-component.html",
  commissionsDisplayText: "components/commissions-component.html",
};

// Get the current page filename
const currentPage = window.location.pathname.split("/").pop() || "index.html";

// Loop over each entry, fetch and inject into corresponding div
Promise.all(
  Object.entries(components).map(([id, file]) =>
    fetch(file)
      .then((res) => res.text())
      .then((html) => {
        // Check if the element exists before setting innerHTML
        const element = document.getElementById(id);
        if (!element) {
          console.warn(
            `Element with ID "${id}" not found on this page. Skipping component.`
          );
          return; // Skip this component if element doesn't exist
        }

        // If this is the navigation component, modify it to mark the active link
        if (id === "navigation") {
          // Create a temporary div to hold the HTML
          const tempDiv = document.createElement("div");
          tempDiv.innerHTML = html;

          // Find and mark active link
          const navLinks = tempDiv.querySelectorAll(".nav-options a");
          navLinks.forEach((link) => {
            if (link.getAttribute("href") === currentPage) {
              link.classList.add("active");
            }
          });

          // Get the modified HTML
          html = tempDiv.innerHTML;
        }

        // Inject the HTML
        element.innerHTML = html;
      })
      .catch((error) => {
        console.error(`Error loading component "${id}" from "${file}":`, error);
      })
  )
).catch((error) => {
  console.error("Error loading components:", error);
});
