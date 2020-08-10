export const request = (
  method: 'get' | 'post' | 'put',
  path: string,
  token?: string,
  body?: object
) => {
  const headers: Record<string, string> = {}
  if (token) {
    headers.Authentication = token
  }
  if (body) {
    headers['Content-Type'] = 'application/json'
  }
  return fetch( `${process.env.VUE_APP_TENKEI_NO_LIST_API_URL}${path}`, {
    method,
    headers,
    mode: 'cors',
    body: body !== undefined ? JSON.stringify(body) : undefined
  });
}