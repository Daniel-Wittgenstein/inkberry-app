# Changing / building the docs file

The docs that are shown to the user when they click help, are built with pandoc.

Edit the docs contents inside "./docs/index.md."

Rebuild the docs/index.html with:

npm run build-docs

# IMPORTANT: ink.js distribution

The app uses inkjs via npm, so the version of inkjs that is used is of course
defined inside "package.json". We use the full inkjs version that includes the compiler.

However every time you create a new project, the file "./ink-js-runtime/ink.js"
is copied into your project. This is the minified, non-full version (without compiler)
of ink.js.

**IMPORTANT**: Whenever you bump up the version of inkjs used by Inkberry
to compile the story (in "package.json") you should also update the file
"./ink-js-runtime/ink.js" (manually).

Otherwise users will get an error because the inkjs used to run the story
is behind the one used to compile the story.
You can find released inkjs minified files here https://github.com/y-lohse/inkjs/releases/
but they lack any comment telling us what version they are inside the file,
so we manually add an extra comment in the first line.
Doing this manually is really no big deal, because ink.js does not update that often.
(Maybe automate in the future.)

**IMPORTANT**: You also MUST CHANGE the ink.js version number shown in the "about" dialog manually. (Configuring this to be automatic is also probably not worth the hassle.)

# Releasing

Whenever you push to main, Github Actions should build new executables.

You can find them under Actions -> Artifacts

We do not do GitHub releases.

Instead just download the executables from there.

Then you have to unzip them and add the relevant folders:

+ ink-js-runtime
+ story-templates

Yes, you have to do this manually.

Zip it up again and it should be a working app (hopefully).

# Testing finished App

npm run build-linux

Builds the app into "dist" folder, allowing you to test it on Linux.

Of course, you also have to copy over the folders (see above) if they aren't there already.
(They are not deleted on each rebuild.)
