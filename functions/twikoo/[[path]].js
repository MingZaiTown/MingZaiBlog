export async function onRequest(context) {
  const url = new URL(context.request.url);
  const target = 'https://project-5luql.vercel.app' + url.pathname.replace('/twikoo', '') + url.search;
  return fetch(new Request(target, {
    method: context.request.method,
    headers: context.request.headers,
    body: context.request.method === 'GET' || context.request.method === 'HEAD' ? null : await context.request.text(),
  }));
}
