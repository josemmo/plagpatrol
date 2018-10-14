<p align="center">
  <img width="80" src="build/icons/256x256.png" alt="" /><br>
  <strong style="font-size:2em">Plag Patrol</strong><br>
  An app for detecting documents tampered to bypass plagiarism detectors
  <br><br>
  <img width="500" src="demo.gif" alt="" />
  <br><br>
</p>

## Introduction
Plag Patrol is an app for finding suspicious alterations in PDF documents made to bypass certain plagiarism detection tools, such as [Turnitin](https://www.turnitin.com/) and [Compilatio](https://www.compilatio.net/), based on a paper that will be published in the upcoming weeks.

Basically, what this app does is highlight all sections of a page **not visible to the naked eye** which will modify the plain text recognized by such tools, thus altering the final plagiarism score of the document.

## Installation
Please visit the [releases section](https://github.com/josemmo/plagpatrol/releases) in this repository to download the latest binary for your Operating System.

If you prefer to build the app yourself, you'll need NodeJS with NPM/Yarn:
```bash
git clone https://github.com/josemmo/plagpatrol
cd plagpatrol
npm install
npm run build
```

## License
Plag Patrol is provided under the [MIT license](LICENSE) and is powered by these awesome technologies:
- [Electron](https://electronjs.org/)
- [jQuery](https://jquery.com/)
- [PDF.js](https://mozilla.github.io/pdf.js/)
- [Webpack](https://webpack.js.org/)
