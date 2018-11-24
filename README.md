<h1 align="center">
  <a href="http://www.amitmerchant.com/electron-markdownify"><img src="build/icons/256x256.png" alt="" width="200"></a><br>
  Plag Patrol<br>
</h1>
<h4 align="center">An app for detecting documents tampered to bypass plagiarism detectors</h4>

<p align="center">
  <a href="https://travis-ci.com/josemmo/plagpatrol"><img src="https://travis-ci.com/josemmo/plagpatrol.svg?branch=master"></a>
  <a href="https://github.com/josemmo/plagpatrol/releases/latest"><img src="https://img.shields.io/badge/download-latest-10a19b.svg"></a>
  <a href="https://josemmo.github.io/plagpatrol/"><img src="https://img.shields.io/badge/open-webapp-ec1b0e.svg"></a>
  <a href="LICENSE"><img src="https://img.shields.io/github/license/josemmo/plagpatrol.svg"></a>
</p>

<p align="center">
  <img src="demo.gif" alt="Desktop app demo" />
</p>

## Introduction
Plag Patrol is an app for finding suspicious alterations in PDF documents made to bypass certain plagiarism detection tools, such as [Turnitin](https://www.turnitin.com/) and [Compilatio](https://www.compilatio.net/), based on [a paper](https://medium.com/@josemmo/1e827211c3f3) firstly published in the November 2018 number of [Sego-Bit](http://www.inf5g.uva.es/?q=node/692).

Basically, what this app does is highlight all sections of a page **not visible to the naked eye** which will modify the plain text recognized by such tools, thus altering the final plagiarism score of the document.

## Installation
Please visit the [releases section](https://github.com/josemmo/plagpatrol/releases/latest) in this repository to download the latest binary for your Operating System.

If you prefer to build the app yourself, you'll need NodeJS with NPM/Yarn:
```bash
# Clone this repository
git clone https://github.com/josemmo/plagpatrol
cd plagpatrol

# Install dependencies
npm install

# Build the app
npm run build
```

## Headless operation
Plag Patrol can run from a terminal without the need for user interaction.

To analyze a document without prompting any window, use the following command:
```bash
plagpatrol path/to/file.pdf --headless
```

This will return, when finished, a JSON string containing the result of the analysis. For example:
```json
{
  "success": true,
  "totalPages": 3,
  "totalIssues": 363,
  "pages": [
    {
      "number": 1,
      "issues": 146
    },
    {
      "number": 2,
      "issues": 136
    },
    {
      "number": 3,
      "issues": 81
    }
  ]
}
```

> WARNING: this functionality is experimental and may not work as expected.

## License
Plag Patrol is provided under the [MIT license](LICENSE) and is powered by these awesome technologies:
- [Electron](https://electronjs.org/)
- [jQuery](https://jquery.com/)
- [PDF.js](https://mozilla.github.io/pdf.js/)
- [Webpack](https://webpack.js.org/)
