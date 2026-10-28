import { renderToStaticMarkup } from 'react-dom/server';
import { ReportView } from './ReportView';
import { submitReport } from './operations.server';
import { reportHref } from './contracts';
import stylesheet from '../../styles.css?inline';
import reportStyles from './report.css?inline';

export async function reportSubmissionResponse(
  request: Request,
  db: D1Database,
  environment: object,
) {
  const result = await submitReport(request, db, environment);
  const headers = { 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'same-origin' };
  if (result.ok)
    return new Response(null, {
      status: 303,
      headers: { ...headers, Location: reportHref({ submitted: result.id }) },
    });
  const html = renderToStaticMarkup(
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content="noindex" />
        <title>Report incorrect information | MediMap</title>
        <style>{`${stylesheet}\n${reportStyles}`}</style>
      </head>
      <body>
        <ReportView data={result.data} draft={result.draft} />
      </body>
    </html>,
  );
  return new Response(`<!doctype html>${html}`, {
    status: result.status,
    headers: { ...headers, 'Content-Type': 'text/html; charset=utf-8' },
  });
}
