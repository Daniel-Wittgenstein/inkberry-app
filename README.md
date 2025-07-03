
# About Inkberry

Inkberry is a free and open-source tool. Its aim is to make the creation of web games with InkleStudio’s Ink/Inky a bit easier.

While Inky is a great tool for game creation, it lacks a live browser preview. That’s where inkberry comes in! Inkberry automatically recompiles your story when it changes and displays the result in a window that is pretty much like a browser. This allows you to quickly test how your game behaves.

Inkberry is not a replacement for Inky, but rather a companion to it. In fact, you are supposed to use both in tandem. :)

(Alternatively, instead of using Inky, you can also use VS code with the Ink integration or any other text editor, but Inky is the recommended choice for beginners.)

[Download](https://github.com/Daniel-Wittgenstein/inkberry-app/releases/tag/0.0.11/)


# Using Inkberry with Inky (Recommended Setup)

- First, if you haven't done this yet, you should download the free
[Inky](https://www.inklestudios.com/ink/)
and familiarize yourself with it.
It's a great editor that allows you to create choice-based text games.

- Once you are done with that, download inkberry, unzip it and run it, even though your operating system tells you that it's a risk. (It's not really a huge risk, but I assume zero responsibility for any data losses or other problems arising from the usage of inkberry. See the license. Make sure to make regular backups.)

- Click on the big "Create a New Project" button.

- Choose a directory and a name for your project. The name is mostly for you. It will be shown in inkberry's "Recent Projects" view, so choose a name that makes sense to you. The name will not be shown in the final game.

- Choose a template.

- A window with some text should open. This is the preview of your game.

- Click on "Project" -> "Open in File Manager" to open the newly created directory. You should see all kinds of files inside it. What you want to do now, is go into **Inky** and open the file "story.ink".

- Change some text and save. You should see your changes reflected in the inkberry preview window!

# Importing an Existing Ink Project that was not Created With Inkberry

If you have already exported a project with Inky's standard web template in the past and you want to use it with inkberry now, open up inkberry, click on the "Convert an Existing Project to Inkberry" button and follow the steps.

# Publishing Your Story

(STEP 1:) This first step is optional. Only do this if you don't want players to have access to your ink source code:

- Make a copy of the project folder.

- Delete all ink files.

- Delete "auto-ink-sources.js"

STEP 2: Zip up the entire contents of your folder.

STEP 3: Upload the zip file to Itch.io or wherever.

# Debugging

CTRL + Shift + i opens the developer tools, pretty much like in a browser.

# Slightly Advanced: Changing the Defaults of an Inkberry Project

When you create a new inkberry project, inkberry chooses default file names for you. For example, a file named "story.ink" is created. This is the main file of your ink project. (The file that includes other ink files via "INCLUDE").

If you are really unhappy with that, you can open the file "ink-package.json" in your project directory. It will look more or less like this:

{

  "projectName": "My Fancy Game",

  "entryFile": "story.js",

  "inkFile": "story.ink"

}

+ "inkfile" is where the name of the main ink file is defined. You may change this.

+ "entryfile" is where the js file with the finished, compiled story is defined. You can change it. (But of course then you might have to change your index.html, too, so that it correctly includes the JavaScript file, etc.)

+ "projectName" defines your project's name **for inkberry**. So that's the project name you will see under "Recent Projects". You can change this as well.

In fact the only difference between a normal directory and a directory that is an inkberry project is the existence of an "ink-package.json" file. If you add an "ink-package.json" file with some JSON in it to a directory it becomes a valid inkberry project.

# More Advanced: Creating your Own Templates

You can even create your own templates. Here's how:

inkberry will look for user defined templates in a special **user templates directory**. The location depends on your OS. Click "About" -> "About" to find the location.

First, you should create that directory, if it does not exist, yet.

Then, inside that directory, create a sub-directory. Let's call it "yet-another-template". This is where your template files will go.

Next, put an "index.html" file into the directory "yet-another-template". It should contain this (or similar): **&lt;script src="story.js">&lt;/script>** to load the compiled story and this: **&lt;script src="ink.js">&lt;/script>** to load the ink runtime. The result of the compiled ink story will end up in the global variable "storyContent".

Add any JS files you want to the directory. You should use the contents of "window.storyContent" to run your ink story. You can also add CSS files to the directory and any other files. They will all be copied over when a new story is created with your template.

Finally, add a file called "template-package.json" to your directory:

{

  "id": "yet-another-template",

  "name": "Yet Another Template for Ink Web Games",

  "version": "0.0.1",

  "author": "Guy Incognito",

  "license": "MIT",

  "descr": "This is a template I created. Enjoy!"

}

Reload inkberry and choose "create a new project". The template should show up.

*Optional:* inkberry automatically creates a file called "auto-ink-sources.js" in your project folder. Your template can optionally load that file. It defines a global variable "$_inkSources" that contains the entire content of all the project's ink files. The template can use this to perform checks. For example, you could search the ink file contents for misspelled special tags and warn the story author.

**Note:** Never use a template if you don't trust the template authors. Opening an untrusted HTML file in inkberry is MORE dangerous than opening it in your browser.

# Distributing your Story Template

+ Put all files for your template into a zip file.

+ Distribute the zip file.

+ Users can create a new directory for the template manually or they can just use the option "Load a Story Template". The "Load a Story Template" option is just a shortcut: it automatically extracts the zip file and copies all the template files into the right location.

# Known issues so far

My story has light background inside inkberry, but dark background inside my browser!

Maybe the template you are using respects user preferences and you set "dark mode" as a preference in your browser or OS.

