export const coverStyles = `
  body {
    font-family: "Noto Serif SC", "Source Han Serif SC", "Source Han Serif", serif;
    line-height: 1.6;
    margin: 0;
    padding: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  }
  .cover {
    text-align: center;
    padding: 4em 2em;
    background: rgba(255, 255, 255, 0.9);
    border-radius: 20px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
    max-width: 80%;
    margin: 2em;
  }
  .cover h1 {
    font-size: 2.5em;
    margin: 0 0 0.5em;
    color: #2d3748;
    font-weight: 700;
    line-height: 1.3;
  }
  .meta-info {
    margin: 2em auto;
    max-width: 40em;
    color: #4a5568;
  }
  .meta-info p {
    margin: 0.7em 0;
    font-size: 1.1em;
  }
  .author {
    font-size: 1.4em;
    color: #718096;
    font-style: italic;
    margin: 1em 0;
  }
  .divider {
    width: 50px;
    height: 3px;
    background: #4a5568;
    margin: 2em auto;
  }
  .stats {
    font-size: 1em;
    color: #718096;
    margin-top: 2em;
  }
`;

export const articleStyles = `
  body {
    font-family: "Noto Serif SC", "Source Han Serif SC", "Source Han Serif", serif;
    line-height: 1.8;
    padding: 2em;
    max-width: 50em;
    margin: 0 auto;
  }
  img {
    max-width: 100%;
    height: auto;
  }
  pre {
    overflow-x: auto;
    padding: 1em;
    background: #f5f5f5;
  }
  code {
    background: #f5f5f5;
    padding: 0.2em 0.4em;
    border-radius: 3px;
  }
  .navigation {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin: 2em 0;
    padding: 1em;
    background: #f8f9fa;
    border-radius: 4px;
  }
  .navigation a {
    color: #0066cc;
    text-decoration: none;
  }
  .navigation a:hover {
    text-decoration: underline;
  }
  .source-link {
    color: #718096;
    font-size: 0.9em;
    margin-top: 2em;
    padding-top: 1em;
    border-top: 1px solid #e2e8f0;
  }
`;

export const tocStyles = `
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    line-height: 1.6;
    padding: 1em;
    max-width: 50em;
    margin: 0 auto;
  }
  .toc {
    list-style: none;
    padding: 0;
  }
  .toc li {
    margin: 1em 0;
    padding: 1em;
    background: #f8f9fa;
    border-radius: 4px;
  }
  .toc a {
    color: #0066cc;
    text-decoration: none;
    font-size: 1.1em;
    font-weight: 500;
  }
  .toc a:hover {
    text-decoration: underline;
  }
  .article-url {
    color: #666;
    font-size: 0.9em;
    margin-top: 0.5em;
  }
  .meta-info {
    margin: 2em 0;
    padding: 1.5em;
    background: #f8f9fa;
    border-radius: 8px;
    color: #444;
  }
  .meta-info h2 {
    margin-top: 0;
    color: #333;
    font-size: 1.2em;
  }
  .meta-info p {
    margin: 0.5em 0;
  }
  .meta-info .author {
    font-style: italic;
    color: #666;
  }
`; 