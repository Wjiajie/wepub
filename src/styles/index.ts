export const coverStyles = `
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    margin: 0;
    padding: 0;
    background-color: #f8f9fa;
    color: #333;
  }
  .cover {
    max-width: 800px;
    margin: 0 auto;
    padding: 40px 20px;
    text-align: center;
  }
  .cover-image {
    margin-bottom: 30px;
  }
  .cover-image img {
    max-width: 100%;
    max-height: 400px;
    object-fit: contain;
    border-radius: 5px;
    box-shadow: 0 4px 8px rgba(0,0,0,0.1);
  }
  .title {
    font-size: 2.5em;
    margin-bottom: 20px;
    line-height: 1.3;
  }
  .title h1 {
    margin-top: 0;
    margin-bottom: 20px;
  }
  .author {
    font-size: 1.2em;
    margin-bottom: 30px;
    color: #555;
  }
  .divider {
    border-top: 1px solid #ddd;
    margin: 30px 0;
  }
  .meta-info {
    font-size: 1em;
    color: #666;
    line-height: 1.6;
  }
  .description {
    margin-bottom: 20px;
  }
  .description p {
    margin: 0.5em 0;
  }
  .stats {
    margin: 5px 0;
  }
  /* Markdown渲染样式 */
  h1, h2, h3, h4, h5, h6 {
    margin-top: 0.5em;
    margin-bottom: 0.5em;
    line-height: 1.3;
  }
  p {
    margin: 0.5em 0;
  }
  a {
    color: #0366d6;
    text-decoration: none;
  }
  a:hover {
    text-decoration: underline;
  }
  code {
    font-family: Consolas, Monaco, 'Andale Mono', monospace;
    background-color: #f1f1f1;
    padding: 2px 4px;
    border-radius: 3px;
  }
  pre {
    background-color: #f1f1f1;
    padding: 10px;
    border-radius: 5px;
    overflow-x: auto;
  }
  blockquote {
    border-left: 4px solid #ddd;
    padding-left: 10px;
    margin-left: 0;
    color: #666;
  }
  ul, ol {
    padding-left: 20px;
  }
  img {
    max-width: 100%;
    height: auto;
  }
  table {
    border-collapse: collapse;
    width: 100%;
    margin: 1em 0;
  }
  table, th, td {
    border: 1px solid #ddd;
  }
  th, td {
    padding: 8px;
    text-align: left;
  }
  th {
    background-color: #f1f1f1;
  }
`;

export const articleStyles = `
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    margin: 0;
    padding: 20px;
    background-color: #fff;
    color: #333;
    line-height: 1.6;
  }
  article {
    max-width: 800px;
    margin: 20px auto;
  }
  h1, h2, h3, h4, h5, h6 {
    margin-top: 1.5em;
    margin-bottom: 0.5em;
    line-height: 1.3;
  }
  h1 {
    font-size: 2em;
  }
  h2 {
    font-size: 1.5em;
  }
  p {
    margin: 1em 0;
  }
  img {
    max-width: 100%;
    height: auto;
    display: block;
    margin: 1em auto;
  }
  pre {
    background-color: #f5f5f5;
    padding: 10px;
    border-radius: 5px;
    overflow-x: auto;
    font-family: Consolas, Monaco, 'Andale Mono', monospace;
  }
  code {
    font-family: Consolas, Monaco, 'Andale Mono', monospace;
    background-color: #f5f5f5;
    padding: 2px 4px;
    border-radius: 3px;
  }
  blockquote {
    border-left: 4px solid #ddd;
    padding-left: 1em;
    margin-left: 0;
    color: #666;
  }
  a {
    color: #0366d6;
    text-decoration: none;
  }
  a:hover {
    text-decoration: underline;
  }
  .navigation {
    display: flex;
    justify-content: space-between;
    margin: 20px 0;
    padding: 10px 0;
    border-top: 1px solid #eee;
    border-bottom: 1px solid #eee;
  }
  .navigation a {
    color: #0366d6;
    text-decoration: none;
  }
  .navigation a:hover {
    text-decoration: underline;
  }
  .source-link {
    margin-top: 30px;
    padding-top: 10px;
    border-top: 1px solid #eee;
    font-size: 0.9em;
    color: #666;
  }
  table {
    border-collapse: collapse;
    width: 100%;
    margin: 1em 0;
  }
  table, th, td {
    border: 1px solid #ddd;
  }
  th, td {
    padding: 8px;
    text-align: left;
  }
  th {
    background-color: #f1f1f1;
  }
  ul, ol {
    padding-left: 20px;
  }
`;

export const tocStyles = `
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    margin: 0;
    padding: 20px;
    background-color: #f8f9fa;
    color: #333;
    line-height: 1.6;
  }
  .cover-image {
    max-width: 800px;
    margin: 20px auto;
    text-align: center;
  }
  .cover-image img {
    max-width: 100%;
    max-height: 300px;
    object-fit: contain;
    border-radius: 5px;
    box-shadow: 0 4px 8px rgba(0,0,0,0.1);
  }
  .title {
    max-width: 800px;
    margin: 20px auto;
    text-align: center;
    font-size: 2em;
    line-height: 1.3;
  }
  .title h1 {
    margin-top: 0;
    margin-bottom: 20px;
  }
  .meta-info {
    max-width: 800px;
    margin: 20px auto;
    padding: 20px;
    background-color: #fff;
    border-radius: 5px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  }
  .author, .description {
    margin-bottom: 10px;
  }
  .description p {
    margin: 0.5em 0;
  }
  .toc {
    max-width: 800px;
    margin: 20px auto;
    padding: 0;
    list-style-type: none;
  }
  .toc li {
    margin-bottom: 10px;
    padding: 15px;
    background-color: #fff;
    border-radius: 5px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    transition: transform 0.2s ease;
  }
  .toc li:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  }
  .toc a {
    display: block;
    color: #0366d6;
    text-decoration: none;
    font-weight: 500;
    font-size: 1.1em;
    margin-bottom: 5px;
  }
  .toc a:hover {
    text-decoration: underline;
  }
  .article-url {
    font-size: 0.9em;
    color: #666;
    word-break: break-all;
  }
  /* Markdown渲染样式 */
  h1, h2, h3, h4, h5, h6 {
    margin-top: 0.5em;
    margin-bottom: 0.5em;
    line-height: 1.3;
  }
  p {
    margin: 0.5em 0;
  }
  a {
    color: #0366d6;
    text-decoration: none;
  }
  a:hover {
    text-decoration: underline;
  }
  code {
    font-family: Consolas, Monaco, 'Andale Mono', monospace;
    background-color: #f1f1f1;
    padding: 2px 4px;
    border-radius: 3px;
  }
  pre {
    background-color: #f1f1f1;
    padding: 10px;
    border-radius: 5px;
    overflow-x: auto;
  }
  blockquote {
    border-left: 4px solid #ddd;
    padding-left: 10px;
    margin-left: 0;
    color: #666;
  }
  ul, ol {
    padding-left: 20px;
  }
  img {
    max-width: 100%;
    height: auto;
  }
  table {
    border-collapse: collapse;
    width: 100%;
    margin: 1em 0;
  }
  table, th, td {
    border: 1px solid #ddd;
  }
  th, td {
    padding: 8px;
    text-align: left;
  }
  th {
    background-color: #f1f1f1;
  }
`; 