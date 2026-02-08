export function light() {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(10)
  }
}

export function medium() {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(25)
  }
}

export function success() {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate([10, 50, 20])
  }
}
