/** A key in a URL path: segments encoded, slashes kept. */
export const encodeKey = (key: string) => key.split("/").map(encodeURIComponent).join("/");
