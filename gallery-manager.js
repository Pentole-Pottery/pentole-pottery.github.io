// gallery-manager.js - Unified gallery system for all pages
// This file will be included in all pages that need gallery functionality

class GalleryManager {
  constructor(options = {}) {
    // Default options
    this.options = {
      containerId: "container",
      jsonPath: "/assets/json/galleryImages.json",
      mobileBreakpoint: 768,
      maxSquareSize: 180,
      squareSpacing: 100, // Changes the spacing between squares. Used to be 40
      seed: null, // null = dynamic random, number = static seeded random
      avoidElements: [
        "#navigation",
        ".navbar",
        "#infoDisplayText",
        "#commissionsDisplayText",
        ".center-text",
      ], // Elements to avoid overlapping with
      elementPadding: 20, // Extra padding around elements to avoid
      resizeDelay: 300, // Delay before handling resize events
      ...options,
    };

    // Initialize properties
    this.container = document.getElementById(this.options.containerId);
    this.isMobile = window.innerWidth <= this.options.mobileBreakpoint;
    this.rng =
      this.options.seed !== null
        ? new this.SeededRandom(this.options.seed)
        : null;
    this.resizeTimer = null;
    this.images = [];
    this.lastWidth = window.innerWidth;

    // Set up resize event listener
    this.setupResizeHandler();

    // Load images and create gallery
    this.init();
  }

  // Simple seeded random number generator
  SeededRandom = class {
    constructor(seed) {
      this.seed = seed % 2147483647;
      if (this.seed <= 0) this.seed += 2147483646;
    }

    next() {
      // LCG algorithm parameters
      this.seed = (this.seed * 16807) % 2147483647;
      return this.seed / 2147483647;
    }
  };

  setupResizeHandler() {
    window.addEventListener("resize", () => {
      // Clear the previous timer
      clearTimeout(this.resizeTimer);

      // Set a new timer to avoid excessive re-renders during resize
      this.resizeTimer = setTimeout(() => {
        const currentWidth = window.innerWidth;
        const wasMobile = this.isMobile;
        this.isMobile = currentWidth <= this.options.mobileBreakpoint;

        // Only rebuild if crossing the mobile breakpoint or significant width change
        if (
          wasMobile !== this.isMobile ||
          Math.abs(this.lastWidth - currentWidth) > 150
        ) {
          this.lastWidth = currentWidth;
          this.rebuildGallery();
        }
      }, this.options.resizeDelay);
    });
  }

  rebuildGallery() {
    // Clear the existing gallery
    while (this.container.firstChild) {
      this.container.removeChild(this.container.firstChild);
    }

    // Create new gallery with the stored images
    if (this.images.length > 0) {
      this.createGallery(this.images);
    } else {
      // If images not yet loaded, fetch them again
      this.init();
    }
  }

  init() {
    // Fetch images from JSON file
    fetch(this.options.jsonPath)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }
        return response.json();
      })
      .then((data) => {
        // Assuming the JSON structure has an "images" array
        this.images = data.images || [];
        this.createGallery(this.images);
      })
      .catch((error) => {
        console.error(`Error fetching ${this.options.jsonPath}:`, error);
        // Fallback to empty gallery or show error message
        this.container.innerHTML = "<p>Failed to load gallery images.</p>";
      });
  }

  createGallery(images) {
    if (this.isMobile) {
      // Grid layout for mobile
      this.createMobileLayout(images);
    } else {
      // Desktop layout with random positions and no overlap
      this.createDesktopLayout(images);
    }
  }

  createMobileLayout(images) {
    images.forEach((src, index) => {
      const square = document.createElement("div");
      square.classList.add("square", `square${index + 1}`);
      const img = document.createElement("img");
      img.src = src;
      img.alt = "Image";
      square.appendChild(img);
      this.container.appendChild(square);
    });
  }

  createDesktopLayout(images) {
    const padding = 16;
    const maxSquareSize = this.options.maxSquareSize;
    const squareSpacing = this.options.squareSpacing;

    // Get element dimensions to avoid
    const elementsToAvoid = this.options.avoidElements
      .map((selector) => {
        const el = document.querySelector(selector);
        return el ? this.getElementDimensions(el) : null;
      })
      .filter(Boolean);

    const containerRect = this.container.getBoundingClientRect();
    const containerLeft = 0;
    const containerTop = 0;
    const containerWidth = containerRect.width - maxSquareSize;
    const containerHeight = containerRect.height - maxSquareSize;

    const placedSquares = [];

    // Create base positions for static layout
    const basePositions = [
      { x: containerWidth * 0.1, y: containerHeight * 0.2 },
      { x: containerWidth * 0.8, y: containerHeight * 0.3 },
      { x: containerWidth * 0.3, y: containerHeight * 0.7 },
      { x: containerWidth * 0.7, y: containerHeight * 0.8 },
      { x: containerWidth * 0.5, y: containerHeight * 0.1 },
      { x: containerWidth * 0.2, y: containerHeight * 0.5 },
      { x: containerWidth * 0.9, y: containerHeight * 0.6 },
      { x: containerWidth * 0.6, y: containerHeight * 0.4 },
      { x: containerWidth * 0.1, y: containerHeight * 0.9 },
      { x: containerWidth * 0.4, y: containerHeight * 0.2 },
      { x: containerWidth * 0.8, y: containerHeight * 0.5 },
      { x: containerWidth * 0.3, y: containerHeight * 0.3 },
      { x: containerWidth * 0.6, y: containerHeight * 0.9 },
      { x: containerWidth * 0.9, y: containerHeight * 0.1 },
      { x: containerWidth * 0.5, y: containerHeight * 0.7 },
    ];

    images.forEach((src, index) => {
      let x, y;
      let attempts = 0;
      const maxAttempts = 200;

      // Different positioning strategy based on whether we're using seeded random or true random
      if (this.rng) {
        // STATIC LAYOUT - Use seeded random for consistent layouts
        // Use the base position as a starting point
        x = basePositions[index % basePositions.length].x;
        y = basePositions[index % basePositions.length].y;

        // Add some consistent randomization using the seeded RNG
        x += (this.rng.next() - 0.5) * containerWidth * 0.2;
        y += (this.rng.next() - 0.5) * containerHeight * 0.2;

        // Keep within container bounds
        x = Math.max(0, Math.min(x, containerWidth));
        y = Math.max(0, Math.min(y, containerHeight));

        // Adjust position if overlapping
        while (
          (this.isOverlapping(x, y, maxSquareSize, placedSquares) ||
            this.isOverlappingElements(x, y, maxSquareSize, elementsToAvoid)) &&
          attempts < maxAttempts
        ) {
          // Try positions in concentric rings around the initial position
          const radius = 20 + attempts * 5;
          const angle = this.rng.next() * Math.PI * 2;

          x =
            basePositions[index % basePositions.length].x +
            Math.cos(angle) * radius;
          y =
            basePositions[index % basePositions.length].y +
            Math.sin(angle) * radius;

          // Keep within container bounds
          x = Math.max(0, Math.min(x, containerWidth));
          y = Math.max(0, Math.min(y, containerHeight));

          attempts++;
        }
      } else {
        // DYNAMIC LAYOUT - Use Math.random() for truly random positions
        do {
          x = containerLeft + Math.random() * containerWidth;
          y = containerTop + Math.random() * containerHeight;
          attempts++;
        } while (
          (this.isOverlapping(x, y, maxSquareSize, placedSquares) ||
            this.isOverlappingElements(x, y, maxSquareSize, elementsToAvoid)) &&
          attempts < maxAttempts
        );
      }

      if (attempts >= maxAttempts) return; // Skip this image if we can't find a valid position

      placedSquares.push({ x, y });

      const square = document.createElement("div");
      square.classList.add("square", `square${index + 1}`);
      square.style.left = `${x}px`;
      square.style.top = `${y}px`;

      const img = document.createElement("img");
      img.src = src;
      img.alt = "Image";
      square.appendChild(img);
      this.container.appendChild(square);
    });
  }

  isOverlapping(x, y, size, others) {
    return others.some(
      (pos) =>
        x < pos.x + size + this.options.squareSpacing &&
        x + size + this.options.squareSpacing > pos.x &&
        y < pos.y + size + this.options.squareSpacing &&
        y + size + this.options.squareSpacing > pos.y
    );
  }

  isOverlappingElements(x, y, size, elements) {
    return elements.some(
      (dims) =>
        x < dims.right &&
        x + size > dims.left &&
        y < dims.bottom &&
        y + size > dims.top
    );
  }

  getElementDimensions(element) {
    if (!element) return null;

    const rect = element.getBoundingClientRect();
    const padding = this.options.elementPadding;

    return {
      left: rect.left - padding,
      top: rect.top - padding,
      right: rect.right + padding,
      bottom: rect.bottom + padding,
      width: rect.width + padding * 2,
      height: rect.height + padding * 2,
    };
  }
}

// Export the GalleryManager class
window.GalleryManager = GalleryManager;
