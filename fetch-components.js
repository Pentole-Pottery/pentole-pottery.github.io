// Fetching components and rendering them
const components = {
  navigation: "components/nav-component.html",
  infoDisplayText: "components/info-component.html",
  commissionsDisplayText: "components/commissions-component.html",
};

// Loop over each entry, fetch and inject into corresponding div
Promise.all(
  Object.entries(components).map(([id, file]) =>
    fetch(file)
      .then((res) => res.text())
      .then((html) => {
        document.getElementById(id).innerHTML = html;
      })
  )
);
