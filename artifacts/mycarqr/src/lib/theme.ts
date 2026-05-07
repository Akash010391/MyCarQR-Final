export function getTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return (localStorage.getItem("theme") as "light" | "dark") || "light";
}

export function setTheme(theme: "light" | "dark") {
  localStorage.setItem("theme", theme);
  if (theme === "dark") {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
}

export function initTheme() {
  const theme = getTheme();
  if (theme === "dark") {
    document.documentElement.classList.add("dark");
  }
}
