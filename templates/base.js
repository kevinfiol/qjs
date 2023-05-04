export const template = ({ content, title }) => `
  <!DOCTYPE html>
  <html lang="en">
      <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <meta http-equiv="X-UA-Compatible" content="ie=edge" />
          <meta name="description" content="kevin f.'s personal site" />
          <link rel="shortcut icon" href="/img/favicon.png" type="image/x-icon" />
          <link rel="stylesheet" href="/css/main.css" />

          <title>
            ${title}
          </title>
      </head>

      <body>
          <div class="dark-mode-container">
              <input id="darkSwitch" type="checkbox" />
              <label class="dark-mode-btn" for="darkSwitch">🌒</label>
          </div>
          <main class="main-content max-width-3 mx-auto">
              <div>
                ${content}
              </div>
          </main>

          <script src="/js/dark-mode-switch.min.js"></script>
      </body>
  </html>
`;