import { renderToStaticMarkup } from 'react-dom/server';
import { writeResolution } from './review-operations.server';
import { reviewHref } from './review-contracts';
import { ReviewManager } from './ReviewManager';
import stylesheet from '../../styles.css?inline';
import adminStyles from '../administration/administration.css?inline';
import formStyles from '../administration/catalogManager.css?inline';
import reportStyles from './report.css?inline';
import reviewStyles from './review.css?inline';

export async function resolutionResponse(request: Request, db: D1Database, environment: object) {
  const result = await writeResolution(request, db, environment);
  const headers = { 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'same-origin' };
  if (result.ok)
    return new Response(null, {
      status: 303,
      headers: {
        ...headers,
        Location: reviewHref({ report: result.reportId, status: 'all', code: 'saved' }),
      },
    });
  const html = renderToStaticMarkup(
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content="noindex" />
        <title>Resolve report | MediMap</title>
        <style>
          {[stylesheet, adminStyles, formStyles, reportStyles, reviewStyles].join('\n')}
        </style>
      </head>
      <body>
        <ReviewManager
          result={result.result}
          search={{ ...result.search, code: result.code }}
          draft={result.draft}
        />
      </body>
    </html>,
  );
  return new Response(`<!doctype html>${html}`, {
    status: result.status,
    headers: { ...headers, 'Content-Type': 'text/html; charset=utf-8' },
  });
}
