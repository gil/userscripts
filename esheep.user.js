// ==UserScript==
// @name         eSheep
// @namespace    https://github.com/gil/userscripts
// @version      0.0.3
// @description  Add an eSheep to any page
// @author       Andre Gil and Adriano Petrucci
// @match        https://*.google.com/*
// @icon         http://esheep.petrucci.ch/favicon.gif
// @grant        GM.addElement
// ==/UserScript==

// This code was copied from the version 0.9.2 of the following project by Adriano Petrucci:
// https://github.com/Adrianotiger/web-esheep
//
// Adriano also provides a userscript, but it loads external files and some pages won't accept that.
// So I've combined everything in a single file, removing a few things that I don't need.
//
// The changes are:
// - Removed the info box
// - Can't change pets
// - Applied Prettier on the code
// - No debugging
// - A few other minor changes

const COLLISION_WITH = ['div', 'hr']; // elements on page to detect for collisions

class eSheep {
  constructor(isChild) {
    this.id = Date.now() + Math.random();

    this.DOMdiv = document.createElement('div'); // Div added to webpage, containing the sheep
    this.DOMdiv.setAttribute('id', this.id);
    this.DOMimg = document.createElement('img'); // Tile image, will be positioned inside the div

    this.parser = new DOMParser(); // XML parser
    this.xmlDoc = null; // parsed XML Document
    this.prepareToDie = false; // when removed, animations should be stopped

    this.isChild = isChild != null; // Child will be removed once they reached the end

    this.tilesX = 1; // Quantity of images inside Tile
    this.tilesY = 1; // Quantity of images inside Tile
    this.imageW = 1; // Width of the sprite image
    this.imageH = 1; // Height of the sprite image
    this.imageX = 1; // Position of sprite inside webpage
    this.imageY = 1; // Position of sprite inside webpage
    this.flipped = false; // if sprite is flipped
    this.dragging = false; // if user is dragging the sheep
    this.animationId = 0; // current animation ID
    this.animationStep = 0; // current animation step
    this.animationNode = null; // current animation DOM node
    this.sprite = new Image(); // sprite image (Tiles)
    this.HTMLelement = null; // the HTML element where the pet is walking on
    this.randS = Math.random() * 100; // random value, will change when page is reloaded

    this.screenW =
      window.innerWidth ||
      document.documentElement.clientWidth ||
      document.body.clientWidth; // window width

    this.screenH =
      window.innerHeight ||
      document.documentElement.clientHeight ||
      document.body.clientHeight; // window height
  }

  /*
   * Start new animation on the page.
   * if animation is not set, the default sheep will be taken
   */
  Start() {
    setTimeout(() => {
      this._parseXML(XML_DATA);
    });
  }

  remove() {
    this.prepareToDie = true;
    setTimeout(() => {
      this.DOMdiv = this.DOMimg = null;
      document.getElementById(this.id).outerHTML = '';
    }, 500);
  }

  /*
   * Parse loaded XML, contains spawn, animations and childs
   */
  _parseXML(text) {
    this.xmlDoc = this.parser.parseFromString(text, 'text/xml');
    var image = this.xmlDoc.getElementsByTagName('image')[0];
    this.tilesX = image.getElementsByTagName('tilesx')[0].textContent;
    this.tilesY = image.getElementsByTagName('tilesy')[0].textContent;
    // Event listener: Sprite was loaded =>
    //   play animation only when the sprite is loaded
    this.sprite.addEventListener('load', () => {
      var attribute =
        'width:' +
        this.sprite.width +
        'px;' +
        'height:' +
        this.sprite.height +
        'px;' +
        'position:absolute;' +
        'top:0px;' +
        'left:0px;' +
        'max-width: none;';
      this.DOMimg.setAttribute('style', attribute);
      // prevent to move image (will show the entire sprite sheet if not catched)
      this.DOMimg.addEventListener('dragstart', e => {
        e.preventDefault();
        return false;
      });
      this.imageW = this.sprite.width / this.tilesX;
      this.imageH = this.sprite.height / this.tilesY;
      attribute =
        'width:' +
        this.imageW +
        'px;' +
        'height:' +
        this.imageH +
        'px;' +
        'position:fixed;' +
        'top:' +
        this.imageY +
        'px;' +
        'left:' +
        this.imageX +
        'px;' +
        'transform:rotatey(0deg);' +
        'cursor:move;' +
        'z-index:2000;' +
        'overflow:hidden;' +
        'image-rendering: crisp-edges;';
      this.DOMdiv.setAttribute('style', attribute);
      this.DOMdiv.appendChild(this.DOMimg);

      if (this.isChild) this._spawnChild();
      else this._spawnESheep();
    });

    this.sprite.src =
      'data:image/png;base64,' +
      image.getElementsByTagName('png')[0].textContent;
    this.DOMimg.setAttribute('src', this.sprite.src);

    // Mouse move over eSheep, check if eSheep should be moved over the screen
    this.DOMdiv.addEventListener('mousemove', e => {
      if (!this.dragging && e.buttons == 1 && e.button == 0) {
        this.dragging = true;
        this.HTMLelement = null;
        var childsRoot = this.xmlDoc.getElementsByTagName('animations')[0];
        var childs = childsRoot.getElementsByTagName('animation');
        for (var k = 0; k < childs.length; k++) {
          if (childs[k].getElementsByTagName('name')[0].textContent == 'drag') {
            this.animationId = childs[k].getAttribute('id');
            this.animationStep = 0;
            this.animationNode = childs[k];
            break;
          }
        }
      }
    });
    // Add event listener to body, if mouse moved too fast over the dragging eSheep
    document.body.addEventListener('mousemove', e => {
      if (this.dragging) {
        this.imageX = parseInt(e.clientX) - this.imageW / 2;
        this.imageY = parseInt(e.clientY) - this.imageH / 2;

        this.DOMdiv.style.left = this.imageX + 'px';
        this.DOMdiv.style.top = this.imageY + 'px';
      }
    });
    // Window resized, recalculate eSheep bounds
    document.body.addEventListener('resize', () => {
      this.screenW =
        window.innerWidth ||
        document.documentElement.clientWidth ||
        document.body.clientWidth;

      this.screenH =
        window.innerHeight ||
        document.documentElement.clientHeight ||
        document.body.clientHeight;

      if (this.imageY + this.imageH > this.screenH) {
        this.imageY = this.screenH - this.imageH;
        this.DOMdiv.style.top = this.imageY + 'px';
      }
      if (this.imageX + this.imageW > this.screenW) {
        this.imageX = this.screenW - this.imageW;
        this.DOMdiv.style.left = this.imageX + 'px';
      }
    });
    // Don't allow contextmenu over the sheep
    this.DOMdiv.addEventListener('contextmenu', e => {
      e.preventDefault();
      return false;
    });
    // Mouse released
    this.DOMdiv.addEventListener('mouseup', _ => {
      if (this.dragging) {
        this.dragging = false;
      }
    });
    // Add sheep elements to the body
    document.body.appendChild(this.DOMdiv);
  }

  /*
   * Set new position for the pet
   * If absolute is true, the x and y coordinates are used as absolute values.
   * If false, x and y are added to the current position
   */
  _setPosition(x, y, absolute) {
    if (this.DOMdiv) {
      if (absolute) {
        this.imageX = parseInt(x);
        this.imageY = parseInt(y);
      } else {
        this.imageX = parseInt(this.imageX) + parseInt(x);
        this.imageY = parseInt(this.imageY) + parseInt(y);
      }
      this.DOMdiv.style.left = this.imageX + 'px';
      this.DOMdiv.style.top = this.imageY + 'px';
    }
  }

  /*
   * Spawn new esheep, this is called if the XML was loaded successfully
   */
  _spawnESheep() {
    var spawnsRoot = this.xmlDoc.getElementsByTagName('spawns')[0];
    var spawns = spawnsRoot.getElementsByTagName('spawn');
    var prob = 0;
    for (var i = 0; i < spawns.length; i++)
      prob += parseInt(spawns[0].getAttribute('probability'));
    var rand = Math.random() * prob;
    prob = 0;
    for (i = 0; i < spawns.length; i++) {
      prob += parseInt(spawns[i].getAttribute('probability'));
      if (prob >= rand || i == spawns.length - 1) {
        this._setPosition(
          this._parseKeyWords(
            spawns[i].getElementsByTagName('x')[0].textContent,
          ),
          this._parseKeyWords(
            spawns[i].getElementsByTagName('y')[0].textContent,
          ),
          true,
        );
        this.animationId =
          spawns[i].getElementsByTagName('next')[0].textContent;
        this.animationStep = 0;
        var childsRoot = this.xmlDoc.getElementsByTagName('animations')[0];
        var childs = childsRoot.getElementsByTagName('animation');
        for (var k = 0; k < childs.length; k++) {
          if (childs[k].getAttribute('id') == this.animationId) {
            this.animationNode = childs[k];

            // Check if child should be loaded toghether with this animation
            var childsRoot = this.xmlDoc.getElementsByTagName('childs')[0];
            var childs = childsRoot.getElementsByTagName('child');
            for (var j = 0; j < childs.length; j++) {
              if (childs[j].getAttribute('animationid') == this.animationId) {
                var eSheepChild = new eSheep(true);
                eSheepChild.animationId =
                  childs[j].getElementsByTagName('next')[0].textContent;
                var x = childs[j].getElementsByTagName('x')[0].textContent; //
                var y = childs[j].getElementsByTagName('y')[0].textContent;
                eSheepChild._setPosition(
                  this._parseKeyWords(x),
                  this._parseKeyWords(y),
                  true,
                );
                // Start animation
                eSheepChild.Start();
                break;
              }
            }
            break;
          }
        }
        break;
      }
    }
    // Play next step
    this._nextESheepStep();
  }

  /*
   * Like spawnESheep, but for Childs
   */
  _spawnChild() {
    var childsRoot = this.xmlDoc.getElementsByTagName('animations')[0];
    var childs = childsRoot.getElementsByTagName('animation');
    for (var k = 0; k < childs.length; k++) {
      if (childs[k].getAttribute('id') == this.animationId) {
        this.animationNode = childs[k];
        break;
      }
    }
    this._nextESheepStep();
  }

  // Parse the human readable expression from XML to a computer readable expression
  _parseKeyWords(value) {
    value = value
      .replace(/screenW/g, this.screenW)
      .replace(/screenH/g, this.screenH)
      .replace(/areaW/g, this.screenH)
      .replace(/areaH/g, this.screenH)
      .replace(/imageW/g, this.imageW)
      .replace(/imageH/g, this.imageH)
      .replace(/random/g, Math.random() * 100)
      .replace(/randS/g, this.randS)
      .replace(/imageX/g, this.imageX)
      .replace(/imageY/g, this.imageY);

    try {
      const number = Number(value);
      return !isNaN(number) ? number : this._slowEval(value);
    } catch (err) {
      console.error(
        "Unable to parse this position: \n'" +
          value +
          "'\n Error message: \n" +
          err.message,
      );
    }
    return 0;
  }

  // Hack needed to evaluate some mathematical expressions without using eval() or new Function()
  _slowEval(value) {
    const tag = GM.addElement('script', {
      textContent: `window.__eSheepExpressionResult = ${value};`,
    });
    tag.parentElement.removeChild(tag);
    return Number(unsafeWindow.__eSheepExpressionResult);
  }

  /*
   * Once the animation is over, get the next animation to play
   */
  _getNextRandomNode(parentNode) {
    var baseNode = parentNode.getElementsByTagName('next');
    var childsRoot = this.xmlDoc.getElementsByTagName('animations')[0];
    var childs = childsRoot.getElementsByTagName('animation');
    var prob = 0;
    var nodeFound = false;

    // no more animations (it was the last one)
    if (baseNode.length == 0) {
      // If it is a child, remove the child from document
      if (this.isChild) {
        // remove child
        document.body.removeChild(this.DOMdiv);
        delete this;
      }
      // else, spawn sheep again
      else {
        this._spawnESheep();
      }
      return false;
    }

    for (var k = 0; k < baseNode.length; k++) {
      prob += parseInt(baseNode[k].getAttribute('probability'));
    }
    var rand = Math.random() * prob;
    var index = 0;
    prob = 0;
    for (k = 0; k < baseNode.length; k++) {
      prob += parseInt(baseNode[k].getAttribute('probability'));
      if (prob >= rand) {
        index = k;
        break;
      }
    }
    for (k = 0; k < childs.length; k++) {
      if (childs[k].getAttribute('id') == baseNode[index].textContent) {
        this.animationId = childs[k].getAttribute('id');
        this.animationStep = 0;
        this.animationNode = childs[k];
        nodeFound = true;
        break;
      }
    }

    if (nodeFound) {
      // create Child, if present
      var childsRoot = this.xmlDoc.getElementsByTagName('childs')[0];
      var childs = childsRoot.getElementsByTagName('child');
      for (k = 0; k < childs.length; k++) {
        if (childs[k].getAttribute('animationid') == this.animationId) {
          var eSheepChild = new eSheep(true);
          eSheepChild.animationId =
            childs[k].getElementsByTagName('next')[0].textContent;
          var x = childs[k].getElementsByTagName('x')[0].textContent; //
          var y = childs[k].getElementsByTagName('y')[0].textContent;
          eSheepChild._setPosition(
            this._parseKeyWords(x),
            this._parseKeyWords(y),
            true,
          );
          eSheepChild.Start();
          break;
        }
      }
    }

    return nodeFound;
  }

  /*
   * Check if sheep is walking over a defined HTML TAG-element
   */
  _checkOverlapping() {
    var x = this.imageX;
    var y = this.imageY + this.imageH;
    var rect;
    var margin = 20;
    if (this.HTMLelement) margin = 5;
    for (var index in COLLISION_WITH) {
      var els = document.body.getElementsByTagName(COLLISION_WITH[index]);

      for (var i = 0; i < els.length; i++) {
        rect = els[i].getBoundingClientRect();

        if (y > rect.top - 2 && y < rect.top + margin) {
          if (x > rect.left && x < rect.right - this.imageW) {
            var style = window.getComputedStyle(els[i]);
            if (
              style.borderTopStyle != '' &&
              style.borderTopStyle != 'none' &&
              style.display != 'none'
            ) {
              return els[i];
            }
          }
        }
      }
    }
    return false;
  }

  /*
   * Try to get the value of a node (from the current animationNode), if it is not possible returns the defaultValue
   */
  _getNodeValue(nodeName, valueName, defaultValue) {
    if (
      !this.animationNode ||
      !this.animationNode.getElementsByTagName(nodeName)
    )
      return;
    if (
      this.animationNode
        .getElementsByTagName(nodeName)[0]
        .getElementsByTagName(valueName)[0]
    ) {
      var value = this.animationNode
        .getElementsByTagName(nodeName)[0]
        .getElementsByTagName(valueName)[0].textContent;

      return this._parseKeyWords(value);
    } else {
      return defaultValue;
    }
  }

  /*
   * Next step (each frame is a step)
   */
  _nextESheepStep() {
    if (this.prepareToDie) return;

    var x1 = this._getNodeValue('start', 'x', 0);
    var y1 = this._getNodeValue('start', 'y', 0);
    var del1 = this._getNodeValue('start', 'interval', 1000);
    var x2 = this._getNodeValue('end', 'x', 0);
    var y2 = this._getNodeValue('end', 'y', 0);
    var del2 = this._getNodeValue('end', 'interval', 1000);

    var repeat = this._parseKeyWords(
      this.animationNode
        .getElementsByTagName('sequence')[0]
        .getAttribute('repeat'),
    );
    var repeatfrom = this.animationNode
      .getElementsByTagName('sequence')[0]
      .getAttribute('repeatfrom');
    var gravity = this.animationNode.getElementsByTagName('gravity');
    var border = this.animationNode.getElementsByTagName('border');

    var steps =
      this.animationNode.getElementsByTagName('frame').length +
      (this.animationNode.getElementsByTagName('frame').length - repeatfrom) *
        repeat;

    var index;

    if (
      this.animationStep <
      this.animationNode.getElementsByTagName('frame').length
    )
      index =
        this.animationNode.getElementsByTagName('frame')[this.animationStep]
          .textContent;
    else if (repeatfrom == 0)
      index =
        this.animationNode.getElementsByTagName('frame')[
          this.animationStep %
            this.animationNode.getElementsByTagName('frame').length
        ].textContent;
    else
      index =
        this.animationNode.getElementsByTagName('frame')[
          parseInt(repeatfrom) +
            parseInt(
              (this.animationStep - repeatfrom) %
                (this.animationNode.getElementsByTagName('frame').length -
                  repeatfrom),
            )
        ].textContent;

    this.DOMimg.style.left = -this.imageW * (index % this.tilesX) + 'px';
    this.DOMimg.style.top = -this.imageH * parseInt(index / this.tilesX) + 'px';

    if (this.dragging) {
      this.animationStep++;
      setTimeout(this._nextESheepStep.bind(this), 50);
      return;
    }

    if (this.flipped) {
      x1 = -x1;
      x2 = -x2;
    }

    if (this.animationStep == 0) this._setPosition(x1, y1, false);
    else
      this._setPosition(
        parseInt(x1) + parseInt(((x2 - x1) * this.animationStep) / steps),
        parseInt(y1) + parseInt(((y2 - y1) * this.animationStep) / steps),
        false,
      );

    this.animationStep++;

    if (this.animationStep >= steps) {
      if (this.animationNode.getElementsByTagName('action')[0]) {
        switch (
          this.animationNode.getElementsByTagName('action')[0].textContent
        ) {
          case 'flip':
            if (this.DOMdiv.style.transform == 'rotateY(0deg)') {
              this.DOMdiv.style.transform = 'rotateY(180deg)';
              this.flipped = true;
            } else {
              this.DOMdiv.style.transform = 'rotateY(0deg)';
              this.flipped = false;
            }
            break;
          default:
            break;
        }
      }
      if (
        !this._getNextRandomNode(
          this.animationNode.getElementsByTagName('sequence')[0],
        )
      )
        return;
    }

    var setNext = false;

    if (border && border[0] && border[0].getElementsByTagName('next')) {
      if (x2 < 0 && this.imageX < 0) {
        this.imageX = 0;
        setNext = true;
      } else if (x2 > 0 && this.imageX > this.screenW - this.imageW) {
        this.imageX = this.screenW - this.imageW;
        this.DOMdiv.style.left = parseInt(this.imageX) + 'px';
        setNext = true;
      } else if (y2 < 0 && this.imageY < 0) {
        this.imageY = 0;
        setNext = true;
      } else if (y2 > 0 && this.imageY > this.screenH - this.imageH) {
        this.imageY = this.screenH - this.imageH;
        setNext = true;
      } else if (y2 > 0) {
        if (this._checkOverlapping()) {
          if (this.imageY > this.imageH) {
            this.HTMLelement = this._checkOverlapping();
            this.imageY =
              Math.ceil(this.HTMLelement.getBoundingClientRect().top) -
              this.imageH;
            setNext = true;
          }
        }
      } else if (this.HTMLelement) {
        if (!this._checkOverlapping()) {
          if (
            this.imageY + this.imageH >
              this.HTMLelement.getBoundingClientRect().top + 3 ||
            this.imageY + this.imageH <
              this.HTMLelement.getBoundingClientRect().top - 3
          ) {
            this.HTMLelement = null;
          } else if (
            this.imageX < this.HTMLelement.getBoundingClientRect().left
          ) {
            this.imageX = parseInt(this.imageX + 3);
            setNext = true;
          } else {
            this.imageX = parseInt(this.imageX - 3);
            setNext = true;
          }
          this.DOMdiv.style.left = parseInt(this.imageX) + 'px';
        }
      }
      if (setNext) {
        if (!this._getNextRandomNode(border[0])) return;
      }
    }
    if (
      !setNext &&
      gravity &&
      gravity[0] &&
      gravity[0].getElementsByTagName('next')
    ) {
      if (this.imageY < this.screenH - this.imageH - 2) {
        if (this.HTMLelement == null) {
          setNext = true;
        } else {
          if (!this._checkOverlapping()) {
            setNext = true;
            this.HTMLelement = null;
          }
        }

        if (setNext) {
          if (!this._getNextRandomNode(gravity[0])) return;
        }
      }
    }
    if (!setNext) {
      if (
        (this.imageX < -this.imageW && x2 < 0) ||
        (this.imageX > this.screenW && x2 > 0) ||
        (this.imageY < -this.imageH && y1 < 0) ||
        (this.imageY > this.screenH && y2 > 0)
      ) {
        setNext = true;
        if (!this.isChild) {
          this._spawnESheep();
        }
        return;
      }
    }

    setTimeout(
      this._nextESheepStep.bind(this),
      parseInt(del1) + parseInt(((del2 - del1) * this.animationStep) / steps),
    );
  }
}

new eSheep().Start();

const XML_DATA = `<?xml version="1.0"?>
<animations>
<header>
<author>Adriano</author>
<title>eSheep 64bit</title>
<petname>eSheep</petname>
<version>1.8</version>
<info>Open source project for the lovely eSheep.[br] For more info, visit my webpage [link:http://esheep.petrucci.ch] [br]Image rip by LiL_Stenly</info>
<application>1</application>
<icon><![CDATA[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8v+M6vL/fcXL/3q8wf95u8H/erzC/3q8wf+M6vL/jOry/zhdYf8AAACYAAAAAAAAAAAAAAAAAAAAeiE9bdY8bcH/U5L+/2We//9lnv//ZZ7//1iV//9CeNb/LlGH/yk/Qf9nnqP/dra7/3W0uv9ysLX/c7K4/3q8wv96vML/ervC/4LQ1/+H3ub/h97m/4fe5v+H3ub/fMLJ/4LQ1/+H3ub/iePr/5H1//+D09r/e8DG/3q8wv96u8L/e8DG/4PT2v+R9f//iePr/3/J0P9/ydD/h97m/4fe5v+R9v//kPX//266wf8+aW3WAAAAegAAAAAAAABmHDRc4EVzwf9emf//Ypz//3Wn//91p///daj//2ef//9emf7/UYbg/x85Zf89XmH/bamu/3q8wv96vML/erzC/3q8wv96vML/erzC/4LQ1/+H3ub/h97m/4fe5v+R9f//hdrh/4vo8P+R9v//j/H6/4fe5v+D09r/g9Pa/4PT2v+D09r/gc7V/3m7wv+H3ub/j/H6/4jh6f+I4en/j/H6/4fe5v+H3ub/h97m/4fe5v9RhYr/AAAAzAAAAAAAAAD/RXfL/2ig//91qP//daj//3Wo//91qP//dKf+/3Wo//91qP//bqT//1aU//8PHDP/UX6G/3Cssv96vML/erzC/3q8wv9+x87/fsfO/37Hzv9+x87/fsfO/37Hzv+M6vL/kPP8/5H2//+P8fr/iePr/37Hzv+R9v//kfb//5H2//+P8fr/iOHp/3q8wv96vML/iOHp/4/x+v+R9v//jez1/37Hzv9+x87/er7E/3q8wv9Sf4P/FyMk1gAAADIAAAD/XYbM/3Wo//91p/7/daf//3Wo//91qP//daf//3Wn//91qP//dKj//3Wo//9PkP//Dxwy/0lwdP96vML/ebzC/3q8wv+R9v//kfb//5H1//+R9f//kfb//5H2//96vML/jOry/5H1//+H3ub/fsfO/5H2//+R9v//kfb//5H1//+H3ub/erzC/3q8wv96vML/erzC/4fe5v+R9v//kPb//5H2//+R9v//fsfO/3q8wv96vML/YZab/wAAAP8AAAD/XYbM/3Wo//91p/7/fa3//6HE//+hxP//oMT//6HE//+PuP//dKj//3Wo//91qP//FyEy/0lwdP96vML/fsfO/5H2//96vML/erzC/3m7wv+D09r/kfb//5H2//+R9v//kfb//5H1//+R9f//kfb//5H2//+R9v//kfb//4PT2v+D09r/kfb//5H2//+R9v//kfb//4PT2v96vML/fsfO/5H2//+R9v//kPb//5H2//+H3ub/YZab/wAAAP8AAAD/XYbM/3Wo//+DsP7/mb/+/6HD//+hw///ocT//6DD//+dwf//mL7+/5i+//91qP//FyEy/0lwdP95vML/er7E/37Hzv+M6vL/jOry/4zq8v+O7/f/kPb+/5H2//+R9v//kPb+/5H1/v+R9f7/kPb+/5H2//+R9v//kPb+/47v9/+O7/f/kPb+/5H2//+R9v//kPb+/47v9/+M6vL/jez1/5D2/v+Q9v7/kPb//5D1/v+P8fr/cLvC/wAAAP8AAAD/XYbM/4Sy//+Wvf//ocT+/6HE//+hxP//ocT//6HE//+hxP7/ocT//6HE//+PuP//HCQy/0lwdP9/ydD/h97m/4fe5v+R9v//kfb+/5H2//+R9v//i+vz/3fBx/93wcf/d8HH/3fBx/+B1t3/kfX+/5H1//+R9f//kfb//5H2//+R9v//kfX+/5H1//+R9f//kfb//5H2//+R9v//kPX//5H2//+R9v//kPX//5H2//+R9v//dMTM/wAAAP8AAAD/d5fM/5zB//+hxP//ocT//6HE//+hxP//ocT//6HE//+hxP7/ocT//6HE//+hxP//U2WE/0Vjbv9lpqv/kfb//5H2//+R9v//kfb+/4bg6P+A0tr/crvC/z1eYf89XmH/PV5h/z1eYf9YjZH/gNLa/4DS2v+R9f//kfb//5H1//+R9v//kfX+/5H1//+R9f//kfb//5H1//+R9v//kfb//5H2//+R9v//kfb//5H2//+R9v//dMTM/wAAAP8AAADMhJKp9KS+6v+lxv//ocT//6HD//+hw///ocP+/6HE//+hxP//ocT//6HE//+hxP//ocT//0BOZv86Ymb/kfb//5H2//+I5Oz/iOTs/2inrP9SfoL/SWVv/yMAI/8XABf/FwAX/x4AHv82Mkn/Un6C/1J+gv+I5Oz/j/L7/5H2//+R9v//kPb+/5H2//+R9v//kfb//5H2//+R9v//kfX+/5D2/v+Q9v7/kfX//5H2//+W9v//f8XM/wAAAP8AAAAAAAAAzHeEmf+30v7/ocT//6HE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AAAAAAAUFhgcXCcrMv8nKzL/kqqt/4vGzP9Fdnr/LxMv/+9h7/+mAKb/7WHt/7swu/+nJ6f/v06//48Aj/+PAI//v06//6c1p/+7P7v/+3X7/+9h7/8WABb/YZ2n/4Xi6v+R9v//kfb//5H2//+R9v//v/n//9P7///l/P7/+P7+////////////MjIy/wAAAGYAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMgAAAP+Cl5j/x+fq/634//95ztb/WX+O/2YwZv/gSeD/+HD4/7owuv+6MLr/+HD4/+BJ4P+MAIz/6GHo/91c3f+7P7v/uz+7//96//8AAAD/c8TL/5D2/v+R9v//mfb//7z5//+8+f//0/v//+b9/v/1/v///v7+//////9mZmb/JycnhAAAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHgAAAJiCl5n/x+fq/7/5//+i9///f9jg/zliZf+ZSZn/mUmZ/6M6o//MTsz//nn+//96//9zAHP/4mHi//96//+0SbT/VQ5V/5lJmf85YmX/f9jg/6L3//+t+P//tvn+/9n8///o/f//6P3///X+////////6urq/5mZmf8AAACYAAAAHgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADMkKiq9Mfn6v/B+v//nPb+/5H2//8dMTP/HTEz/4ZOjv/LYcv/y2HL/8thy/9bAFv/tU61/8thy/+GTo7/HTEz/x0xM/+f9///n/f//8b6///g/P//4Pz//+D8/////////////+Dg4P/Ly8v/qqqq9AAAAMwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAzIKXmP/Y+/7/yvr//5H2//+R9v//kfb//zliZf8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP85YmX/kfb//5H2///Z/P//2fz//+/9/////////////////////////////2VlZf8AAAD/AAAAzAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAJhWZGb/2Pz//9n8///Z/P//n/f//5H2//+R9v//kfb//5H2//+R9v//kfb//5H2//+t+P//2fz//9n8///Z/P//9/7///////+ZmZn/AAAA/wAAAP8AAAD/AAAA/wAAAGYAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB4hJieEKzIz/ysyM//Z/P//zfv+/8r6/v/K+v7/yvr//8r6///K+v//yvr//8r6/v/Q+/7/3/z///f+///3/v//Wltb/zMzM/8tLS2sAAAAMgAAADIAAAAyAAAAMgAAABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoAAAAZgAAAGZWZGb/VmRm/1ZkZv9WZGb/VmRm/1ZkZv9WZGb/VmRm/1ZkZv9WZGb/WWVm/2ZmZv9mZmb/JycnhAAAAGYAAAA8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACYAAAAmAAAAJgAAACYAAAAmAAAAJgAAACYAAAAmAAAAJgAAACYAAAAmAAAAJgAAACYAAAAHgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/+B//A/8AAP/4B/wD/wAA//gD/AP/AAD/+AP8A/8AAP/4A/wD/wAA//gDgAP/AAD/+AAAA/8AAP/wAAAAfwAA/+AAAAA/AAD/wAAAAD8AAPwAAAAAHwAA8AAAAAAPAADAAAAAAAMAAMAAAAAAAwAAwAAAAAADAACAAAAAAAEAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAAAAAAADAAAAAAAAAAOAAAAAAAAAA8AAAAAAAAAD4AAAAAAAAAPwAAAAAAAAA/gAAAAABAAD+AAAAAAEAAP4AAAAAAwAA/wAAAAADAAD/AAAAAAMAAP+AAAAABwAA/8AAAAAPAAD/wAAAAA8AAP/gAAAADwAA/+AAAAAPAAD/4AAAAB8AAP/wAAAAPwAA//gAAAB/AAD//AAAA/8AAP/+AAA//wAA///AAP//AAD//8AB//8AAP///////wAA////////AAA=]]></icon>
</header>
<image>
<tilesx>16</tilesx>
<tilesy>11</tilesy>
<png><![CDATA[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]]></png>
<transparency>Magenta</transparency>
</image>
<spawns>
<spawn id="1" probability="20">
<x>screenW+10</x>
<y>areaH-imageH</y>
<next probability="100">1</next>
</spawn>
<spawn id="2" probability="80">
<x>random*(screenW-imageW-50)/100+25</x>
<y>-imageH-20</y>
<next probability="100">1</next>
</spawn>
<spawn id="3" probability="3">
<x>screenW+10</x>
<y>areaH/2-(randS*areaH/2)/120-imageH</y>
<next>21</next>
</spawn>
<spawn id="4" probability="3">
<x>screenW</x>
<y>areaH-imageH</y>
<next>28</next>
</spawn>
</spawns>
<animations>
<animation id="1">
<name>walk</name>
<start>
<x>-2</x>
<y>0</y>
<interval>200</interval>
<offsety>0</offsety>
<opacity>1.0</opacity>
</start>
<end>
<x>-2</x>
<y>0</y>
<interval>200</interval>
<offsety>0</offsety>
<opacity>1.0</opacity>
</end>
<sequence repeat="20" repeatfrom="0">
<frame>2</frame>
<frame>3</frame>
<next probability="2" only="window">11</next>
<next probability="10" only="taskbar">35</next>
<next probability="90" only="none">1</next>
<next probability="6" only="none">15</next>
<next probability="50" only="taskbar">50</next>
<next probability="50" only="window">49</next>
</sequence>
<border>
<next probability="100" only="none">2</next>
<next probability="2" only="vertical">37</next>
<next probability="20" only="window">43</next>
</border>
<gravity>
<next probability="100" only="none">5</next>
</gravity>
</animation>
<animation id="2">
<name>rotate1a</name>
<start>
<x>0</x>
<y>0</y>
<interval>200</interval>
</start>
<end>
<x>0</x>
<y>0</y>
<interval>200</interval>
</end>
<sequence repeat="0" repeatfrom="0">
<frame>3</frame>
<frame>9</frame>
<frame>10</frame>
<next probability="100">3</next>
<action>flip</action>
</sequence>
</animation>
<animation id="3">
<name>rotate1b</name>
<start>
<x>0</x>
<y>0</y>
<interval>200</interval>
<offsety>0</offsety>
<opacity>1.0</opacity>
</start>
<end>
<x>0</x>
<y>0</y>
<interval>200</interval>
<offsety>0</offsety>
<opacity>1.0</opacity>
</end>
<sequence repeat="0" repeatfrom="0">
<frame>10</frame>
<frame>9</frame>
<frame>3</frame>
<next probability="100" only="none">1</next>
<next probability="5" only="taskbar">26</next>
</sequence>
</animation>
<animation id="4">
<name>drag</name>
<start>
<x>0</x>
<y>0</y>
<interval>100</interval>
<offsety>0</offsety>
<opacity>1.0</opacity>
</start>
<end>
<x>0</x>
<y>0</y>
<interval>100</interval>
<offsety>0</offsety>
<opacity>1.0</opacity>
</end>
<sequence repeat="0" repeatfrom="0">
<frame>42</frame>
<frame>43</frame>
<frame>43</frame>
<frame>42</frame>
<frame>44</frame>
<frame>44</frame>
<next probability="100" only="none">1</next>
</sequence>
</animation>
<animation id="5">
<name>fall</name>
<start>
<x>0</x>
<y>1</y>
<interval>100</interval>
<offsety>0</offsety>
<opacity>1.0</opacity>
</start>
<end>
<x>0</x>
<y>10</y>
<interval>40</interval>
<offsety>0</offsety>
<opacity>1.0</opacity>
</end>
<sequence repeat="20" repeatfrom="0">
<frame>133</frame>
<next probability="100" only="none">6</next>
</sequence>
<border>
<next probability="100" only="none">9</next>
</border>
</animation>
<animation id="6">
<name>fall fast</name>
<start>
<x>0</x>
<y>10</y>
<interval>40</interval>
<offsety>0</offsety>
<opacity>1.0</opacity>
</start>
<end>
<x>0</x>
<y>10</y>
<interval>40</interval>
<offsety>2</offsety>
<opacity>1.0</opacity>
</end>
<sequence repeat="10" repeatfrom="0">
<frame>46</frame>
<frame>46</frame>
<frame>46</frame>
<next probability="100" only="none">6</next>
</sequence>
<border>
<next probability="100" only="none">10</next>
</border>
</animation>
<animation id="7">
<name>run</name>
<start>
<x>-10</x>
<y>0</y>
<interval>100</interval>
<offsety>0</offsety>
<opacity>1.0</opacity>
</start>
<end>
<x>-10</x>
<y>0</y>
<interval>100</interval>
<offsety>0</offsety>
<opacity>1.0</opacity>
</end>
<sequence repeat="5" repeatfrom="0">
<frame>5</frame>
<frame>4</frame>
<frame>4</frame>
<next probability="40" only="none">7</next>
<next probability="80" only="none">36</next>
<next probability="20" only="taskbar">25</next>
</sequence>
<border>
<next probability="100" only="vertical">8</next>
</border>
<gravity>
<next probability="100" only="none">5</next>
</gravity>
</animation>
<animation id="8">
<name>boing</name>
<start>
<x>1</x>
<y>0</y>
<interval>100</interval>
</start>
<end>
<x>10</x>
<y>0</y>
<interval>100</interval>
</end>
<sequence repeat="0" repeatfrom="0">
<frame>62</frame>
<frame>62</frame>
<frame>63</frame>
<frame>64</frame>
<frame>65</frame>
<frame>66</frame>
<frame>67</frame>
<frame>68</frame>
<frame>69</frame>
<frame>70</frame>
<frame>6</frame>
<next probability="20">2</next>
<next probability="5">7</next>
<next probability="80">1</next>
</sequence>
</animation>
<animation id="9">
<name>fall soft</name>
<start>
<x>0</x>
<y>0</y>
<interval>800</interval>
<offsety>1</offsety>
<opacity>1.0</opacity>
</start>
<end>
<x>0</x>
<y>0</y>
<interval>200</interval>
<offsety>0</offsety>
<opacity>1.0</opacity>
</end>
<sequence repeat="0" repeatfrom="0">
<frame>133</frame>
<frame>133</frame>
<frame>133</frame>
<frame>133</frame>
<frame>49</frame>
<frame>13</frame>
<frame>12</frame>
<frame>6</frame>
<next probability="100" only="none">1</next>
</sequence>
</animation>
<animation id="10">
<name>fall hard</name>
<start>
<x>0</x>
<y>0</y>
<interval>200</interval>
<offsety>2</offsety>
<opacity>1.0</opacity>
</start>
<end>
<x>0</x>
<y>0</y>
<interval>500</interval>
<offsety>2</offsety>
<opacity>1.0</opacity>
</end>
<sequence repeat="0" repeatfrom="0">
<frame>48</frame>
<frame>48</frame>
<frame>48</frame>
<frame>48</frame>
<frame>47</frame>
<next probability="100" only="none">1</next>
</sequence>
</animation>
<animation id="11">
<name>pissa</name>
<start>
<x>0</x>
<y>0</y>
<interval>200</interval>
</start>
<end>
<x>0</x>
<y>0</y>
<interval>200</interval>
</end>
<sequence repeat="5+random/10" repeatfrom="5">
<frame>3</frame>
<frame>12</frame>
<frame>13</frame>
<frame>103</frame>
<frame>104</frame>
<frame>105</frame>
<frame>106</frame>
<next probability="100">12</next>
</sequence>
</animation>
<animation id="12">
<name>pissb</name>
<start>
<x>0</x>
<y>0</y>
<interval>200</interval>
</start>
<end>
<x>0</x>
<y>0</y>
<interval>200</interval>
</end>
<sequence repeat="0" repeatfrom="0">
<frame>104</frame>
<frame>105</frame>
<frame>104</frame>
<frame>104</frame>
<frame>103</frame>
<frame>13</frame>
<frame>12</frame>
<next probability="100">1</next>
</sequence>
</animation>
<animation id="13">
<name>kill</name>
<start>
<x>0</x>
<y>0</y>
<interval>100</interval>
<offsety>0</offsety>
<opacity>1.0</opacity>
</start>
<end>
<x>0</x>
<y>0</y>
<interval>200</interval>
<offsety>0</offsety>
<opacity>1.0</opacity>
</end>
<sequence repeat="20" repeatfrom="1">
<frame>3</frame>
<frame>96</frame>
<frame>96</frame>
<next probability="100" only="none">1</next>
</sequence>
</animation>
<animation id="14">
<name>sync</name>
<start>
<x>0</x>
<y>0</y>
<interval>30</interval>
</start>
<end>
<x>0</x>
<y>0</y>
<interval>100</interval>
</end>
<sequence repeat="12" repeatfrom="0">
<frame>50</frame>
<frame>51</frame>
<next probability="100">1</next>
</sequence>
</animation>
<animation id="15">
<name>sleep1a</name>
<start>
<x>0</x>
<y>0</y>
<interval>1000</interval>
<offsety>0</offsety>
<opacity>1.0</opacity>
</start>
<end>
<x>0</x>
<y>0</y>
<interval>200</interval>
<offsety>0</offsety>
<opacity>1.0</opacity>
</end>
<sequence repeat="random/5+10" repeatfrom="9">
<frame>3</frame>
<frame>107</frame>
<frame>108</frame>
<frame>107</frame>
<frame>108</frame>
<frame>107</frame>
<frame>31</frame>
<frame>32</frame>
<frame>33</frame>
<frame>0</frame>
<frame>1</frame>
<next probability="100" only="none">16</next>
</sequence>
</animation>
<animation id="16">
<name>sleep1b</name>
<start>
<x>0</x>
<y>0</y>
<interval>200</interval>
</start>
<end>
<x>0</x>
<y>0</y>
<interval>200</interval>
</end>
<sequence repeat="0" repeatfrom="0">
<frame>0</frame>
<frame>80</frame>
<frame>79</frame>
<frame>78</frame>
<frame>77</frame>
<frame>37</frame>
<frame>38</frame>
<frame>39</frame>
<frame>38</frame>
<frame>37</frame>
<frame>6</frame>
<next probability="100">1</next>
</sequence>
</animation>
<animation id="17">
<name>sleep2a</name>
<start>
<x>0</x>
<y>0</y>
<interval>200</interval>
<offsety>0</offsety>
<opacity>1.0</opacity>
</start>
<end>
<x>0</x>
<y>0</y>
<interval>200</interval>
<offsety>0</offsety>
<opacity>1.0</opacity>
</end>
<sequence repeat="random/10+20" repeatfrom="6">
<frame>3</frame>
<frame>6</frame>
<frame>7</frame>
<frame>8</frame>
<frame>8</frame>
<frame>7</frame>
<frame>8</frame>
<frame>8</frame>
<next probability="100" only="none">18</next>
</sequence>
</animation>
<animation id="18">
<name>sleep2b</name>
<start>
<x>0</x>
<y>0</y>
<interval>200</interval>
</start>
<end>
<x>0</x>
<y>0</y>
<interval>200</interval>
</end>
<sequence repeat="0" repeatfrom="0">
<frame>8</frame>
<frame>7</frame>
<frame>6</frame>
<next probability="100">7</next>
</sequence>
</animation>
<animation id="19">
<name>sleep3a</name>
<start>
<x>0</x>
<y>0</y>
<interval>200</interval>
<offsety>1</offsety>
<opacity>1.0</opacity>
</start>
<end>
<x>0</x>
<y>0</y>
<interval>200</interval>
<offsety>1</offsety>
<opacity>1.0</opacity>
</end>
<sequence repeat="random/10+30" repeatfrom="7">
<frame>3</frame>
<frame>9</frame>
<frame>10</frame>
<frame>34</frame>
<frame>35</frame>
<frame>34</frame>
<frame>35</frame>
<frame>36</frame>
<frame>36</frame>
<next probability="100" only="none">20</next>
</sequence>
</animation>
<animation id="20">
<name>sleep3b</name>
<start>
<x>0</x>
<y>0</y>
<interval>200</interval>
<offsety>1</offsety>
<opacity>1.0</opacity>
</start>
<end>
<x>0</x>
<y>0</y>
<interval>200</interval>
<offsety>0</offsety>
<opacity>1.0</opacity>
</end>
<sequence repeat="0" repeatfrom="0">
<frame>35</frame>
<frame>36</frame>
<frame>36</frame>
<frame>35</frame>
<frame>34</frame>
<frame>34</frame>
<frame>34</frame>
<frame>10</frame>
<frame>9</frame>
<next probability="100" only="none">1</next>
</sequence>
</animation>
<animation id="21">
<name>batha</name>
<start>
<x>-2</x>
<y>2</y>
<interval>30</interval>
<offsety>0</offsety>
<opacity>1.0</opacity>
</start>
<end>
<x>-2</x>
<y>2</y>
<interval>30</interval>
<offsety>0</offsety>
<opacity>1.0</opacity>
</end>
<sequence repeat="(areaH/2+(randS*areaH/2)/120-imageH-68)/2" repeatfrom="0">
<frame>134</frame>
<next probability="100" only="none">22</next>
</sequence>
</animation>
<animation id="22">
<name>bathb</name>
<start>
<x>-2</x>
<y>2</y>
<interval>30</interval>
<offsety>0</offsety>
<opacity>1.0</opacity>
</start>
<end>
<x>-2</x>
<y>2</y>
<interval>32</interval>
<offsety>0</offsety>
<opacity>1.0</opacity>
</end>
<sequence repeat="0" repeatfrom="0">
<frame>135</frame>
<frame>135</frame>
<frame>135</frame>
<frame>135</frame>
<frame>136</frame>
<frame>136</frame>
<frame>136</frame>
<frame>136</frame>
<frame>137</frame>
<frame>137</frame>
<frame>137</frame>
<frame>137</frame>
<frame>138</frame>
<frame>138</frame>
<frame>138</frame>
<frame>138</frame>
<frame>139</frame>
<frame>139</frame>
<frame>139</frame>
<frame>139</frame>
<frame>140</frame>
<frame>140</frame>
<frame>140</frame>
<frame>140</frame>
<frame>141</frame>
<frame>141</frame>
<frame>141</frame>
<frame>141</frame>
<frame>142</frame>
<frame>142</frame>
<frame>142</frame>
<frame>142</frame>
<frame>143</frame>
<frame>143</frame>
<frame>143</frame>
<frame>143</frame>
<frame>144</frame>
<frame>144</frame>
<frame>144</frame>
<frame>144</frame>
<frame>145</frame>
<frame>144</frame>
<frame>145</frame>
<frame>144</frame>
<frame>145</frame>
<frame>144</frame>
<frame>145</frame>
<frame>144</frame>
<frame>174</frame>
<frame>174</frame>
<frame>174</frame>
<frame>174</frame>
<frame>174</frame>
<frame>174</frame>
<frame>174</frame>
<next probability="100" only="none">47</next>
</sequence>
<border>
<next probability="100" only="none">47</next>
</border>
</animation>
<animation id="23">
<name>bathw</name>
<start>
<x>0</x>
<y>0</y>
<interval>30</interval>
<offsety>0</offsety>
<opacity>1.0</opacity>
</start>
<end>
<x>0</x>
<y>0</y>
<interval>30</interval>
<offsety>0</offsety>
<opacity>1.0</opacity>
</end>
<sequence repeat="(areaH/2+(randS*areaH/2)/120-imageH-10)/2" repeatfrom="0">
<frame>146</frame>
<next probability="100" only="none">24</next>
</sequence>
</animation>
<animation id="24">
<name>bathz</name>
<start>
<x>0</x>
<y>0</y>
<interval>30</interval>
<offsety>0</offsety>
<opacity>1.0</opacity>
</start>
<end>
<x>0</x>
<y>0</y>
<interval>50</interval>
<offsety>0</offsety>
<opacity>1.0</opacity>
</end>
<sequence repeat="5" repeatfrom="20">
<frame>146</frame>
<frame>146</frame>
<frame>146</frame>
<frame>146</frame>
<frame>146</frame>
<frame>146</frame>
<frame>146</frame>
<frame>146</frame>
<frame>146</frame>
<frame>146</frame>
<frame>146</frame>
<frame>146</frame>
<frame>147</frame>
<frame>147</frame>
<frame>148</frame>
<frame>148</frame>
<frame>148</frame>
<frame>147</frame>
<frame>147</frame>
<frame>146</frame>
<frame>146</frame>
<frame>146</frame>
<frame>146</frame>
<frame>146</frame>
</sequence>
</animation>
<animation id="25">
<name>jump</name>
<start>
<x>-10</x>
<y>-15</y>
<interval>100</interval>
<offsety>0</offsety>
<opacity>1.0</opacity>
</start>
<end>
<x>-10</x>
<y>15</y>
<interval>100</interval>
<offsety>0</offsety>
<opacity>1.0</opacity>
</end>
<sequence repeat="0" repeatfrom="0">
<frame>76</frame>
<frame>30</frame>
<frame>30</frame>
<frame>30</frame>
<frame>30</frame>
<frame>23</frame>
<frame>23</frame>
<frame>23</frame>
<frame>23</frame>
<frame>23</frame>
<frame>24</frame>
<frame>24</frame>
<frame>24</frame>
<frame>24</frame>
<frame>77</frame>
<next probability="100" only="none">7</next>
</sequence>
<border>
<next probability="80" only="taskbar">7</next>
<next probability="20" only="horizontal+">36</next>
</border>
</animation>
<animation id="26">
<name>eat</name>
<start>
<x>0</x>
<y>0</y>
<interval>300</interval>
<offsety>0</offsety>
<opacity>1.0</opacity>
</start>
<end>
<x>0</x>
<y>0</y>
<interval>300</interval>
<offsety>0</offsety>
<opacity>1.0</opacity>
</end>
<sequence repeat="5" repeatfrom="5">
<frame>6</frame>
<frame>6</frame>
<frame>6</frame>
<frame>6</frame>
<frame>58</frame>
<frame>59</frame>
<frame>59</frame>
<frame>60</frame>
<frame>61</frame>
<frame>60</frame>
<frame>61</frame>
<frame>6</frame>
<next probability="100" only="none">1</next>
</sequence>
</animation>
<animation id="27">
<name>flower</name>
<start>
<x>0</x>
<y>0</y>
<interval>300</interval>
<offsety>0</offsety>
<opacity>0.8</opacity>
</start>
<end>
<x>0</x>
<y>0</y>
<interval>300</interval>
<offsety>0</offsety>
<opacity>1.0</opacity>
</end>
<sequence repeat="0" repeatfrom="0">
<frame>174</frame>
<frame>153</frame>
<frame>153</frame>
<frame>153</frame>
<frame>153</frame>
<frame>153</frame>
<frame>149</frame>
<frame>149</frame>
<frame>149</frame>
<frame>149</frame>
<frame>149</frame>
<frame>149</frame>
<frame>149</frame>
<frame>149</frame>
<frame>149</frame>
<frame>150</frame>
<frame>150</frame>
<frame>150</frame>
<frame>150</frame>
<frame>150</frame>
<frame>150</frame>
<frame>150</frame>
<frame>151</frame>
<frame>151</frame>
<frame>151</frame>
<frame>151</frame>
<frame>151</frame>
<frame>151</frame>
<frame>151</frame>
<frame>152</frame>
<frame>152</frame>
<frame>152</frame>
<frame>152</frame>
<frame>152</frame>
<frame>152</frame>
<frame>152</frame>
<frame>174</frame>
<frame>174</frame>
<frame>174</frame>
</sequence>
</animation>
<animation id="28">
<name>blacksheepa</name>
<start>
<x>-10</x>
<y>0</y>
<interval>100</interval>
<offsety>0</offsety>
<opacity>1.0</opacity>
</start>
<end>
<x>-10</x>
<y>0</y>
<interval>100</interval>
<offsety>0</offsety>
<opacity>1.0</opacity>
</end>
<sequence repeat="(screenW/2)/30-6" repeatfrom="0">
<frame>5</frame>
<frame>4</frame>
<frame>4</frame>
<next probability="100" only="none">29</next>
</sequence>
</animation>
<animation id="29">
<name>blacksheepb</name>
<start>
<x>-6</x>
<y>0</y>
<interval>100</interval>
<offsety>0</offsety>
<opacity>1.0</opacity>
</start>
<end>
<x>0</x>
<y>0</y>
<interval>100</interval>
<offsety>0</offsety>
<opacity>1.0</opacity>
</end>
<sequence repeat="25+(Convert(screenW/2,System.Int32)%30)/7" repeatfrom="0">
<frame>2</frame>
<frame>3</frame>
<next probability="100" only="none">30</next>
</sequence>
</animation>
<animation id="30">
<name>blacksheepc</name>
<start>
<x>0</x>
<y>0</y>
<interval>500</interval>
<offsety>0</offsety>
<opacity>1.0</opacity>
</start>
<end>
<x>0</x>
<y>0</y>
<interval>500</interval>
<offsety>0</offsety>
<opacity>1.0</opacity>
</end>
<sequence repeat="0" repeatfrom="0">
<frame>8</frame>
<frame>3</frame>
<frame>3</frame>
<frame>3</frame>
<frame>127</frame>
<frame>128</frame>
<frame>129</frame>
<frame>130</frame>
<frame>130</frame>
<frame>130</frame>
<frame>130</frame>
<frame>129</frame>
<frame>128</frame>
<frame>127</frame>
<frame>3</frame>
<frame>3</frame>
<frame>3</frame>
<next probability="100" only="none">1</next>
</sequence>
</animation>
<animation id="31">
<name>blacksheepv</name>
<start>
<x>10</x>
<y>0</y>
<interval>100</interval>
<offsety>0</offsety>
<opacity>1.0</opacity>
</start>
<end>
<x>10</x>
<y>0</y>
<interval>100</interval>
<offsety>0</offsety>
<opacity>1.0</opacity>
</end>
<sequence repeat="(screenW/2)/30-6" repeatfrom="0">
<frame>155</frame>
<frame>154</frame>
<frame>154</frame>
<next probability="100" only="none">32</next>
</sequence>
</animation>
<animation id="32">
<name>blacksheepw</name>
<start>
<x>6</x>
<y>0</y>
<interval>100</interval>
<offsety>0</offsety>
<opacity>1.0</opacity>
</start>
<end>
<x>0</x>
<y>0</y>
<interval>100</interval>
<offsety>0</offsety>
<opacity>1.0</opacity>
</end>
<sequence repeat="24+(Convert(screenW/2,System.Int32)%30)/7" repeatfrom="0">
<frame>156</frame>
<frame>157</frame>
<next probability="100" only="none">33</next>
</sequence>
</animation>
<animation id="33">
<name>blacksheepy</name>
<start>
<x>0</x>
<y>0</y>
<interval>500</interval>
<offsety>0</offsety>
<opacity>1.0</opacity>
</start>
<end>
<x>0</x>
<y>0</y>
<interval>500</interval>
<offsety>0</offsety>
<opacity>1.0</opacity>
</end>
<sequence repeat="9" repeatfrom="0">
<frame>157</frame>
<next probability="100" only="none">34</next>
</sequence>
</animation>
<animation id="34">
<name>blacksheepz</name>
<start>
<x>0</x>
<y>0</y>
<interval>20</interval>
<offsety>0</offsety>
<opacity>1.0</opacity>
</start>
<end>
<x>0</x>
<y>0</y>
<interval>20</interval>
<offsety>0</offsety>
<opacity>0.0</opacity>
</end>
<sequence repeat="20" repeatfrom="0">
<frame>157</frame>
</sequence>
</animation>
<animation id="35">
<name>run_begin</name>
<start>
<x>-2</x>
<y>0</y>
<interval>200</interval>
<offsety>0</offsety>
<opacity>1.0</opacity>
</start>
<end>
<x>-10</x>
<y>0</y>
<interval>100</interval>
<offsety>0</offsety>
<opacity>1.0</opacity>
</end>
<sequence repeat="0" repeatfrom="0">
<frame>2</frame>
<frame>3</frame>
<frame>2</frame>
<frame>5</frame>
<frame>4</frame>
<frame>5</frame>
<frame>4</frame>
<frame>5</frame>
<next probability="100" only="none">7</next>
</sequence>
<border>
<next probability="100" only="vertical">8</next>
</border>
</animation>
<animation id="36">
<name>run_end</name>
<start>
<x>-10</x>
<y>0</y>
<interval>100</interval>
<offsety>0</offsety>
<opacity>1.0</opacity>
</start>
<end>
<x>-2</x>
<y>0</y>
<interval>200</interval>
<offsety>0</offsety>
<opacity>1.0</opacity>
</end>
<sequence repeat="0" repeatfrom="0">
<frame>5</frame>
<frame>4</frame>
<frame>5</frame>
<frame>4</frame>
<frame>5</frame>
<frame>3</frame>
<frame>2</frame>
<frame>3</frame>
<frame>2</frame>
<frame>3</frame>
<next probability="100" only="none">1</next>
</sequence>
<border>
<next probability="100" only="vertical">8</next>
</border>
</animation>
<animation id="37">
<name>vertical_walk_up</name>
<start>
<x>0</x>
<y>-2</y>
<interval>150</interval>
<offsety>0</offsety>
<opacity>1.0</opacity>
</start>
<end>
<x>0</x>
<y>-2</y>
<interval>150</interval>
<offsety>0</offsety>
<opacity>1.0</opacity>
</end>
<sequence repeat="5000" repeatfrom="2">
<frame>31</frame>
<frame>30</frame>
<frame>15</frame>
<frame>16</frame>
<next probability="100" only="none">37</next>
</sequence>
<border>
<next probability="100" only="none">38</next>
</border>
</animation>
<animation id="38">
<name>top_walk</name>
<start>
<x>0</x>
<y>0</y>
<interval>200</interval>
<offsety>0</offsety>
<opacity>1.0</opacity>
</start>
<end>
<x>2</x>
<y>0</y>
<interval>200</interval>
<offsety>0</offsety>
<opacity>1.0</opacity>
</end>
<sequence repeat="0" repeatfrom="0">
<frame>16</frame>
<frame>17</frame>
<frame>28</frame>
<action>flip</action>
<next probability="100" only="none">39</next>
</sequence>
</animation>
<animation id="39">
<name>top_walk2</name>
<start>
<x>-2</x>
<y>0</y>
<interval>150</interval>
<offsety>-2</offsety>
<opacity>1.0</opacity>
</start>
<end>
<x>-2</x>
<y>0</y>
<interval>150</interval>
<offsety>-2</offsety>
<opacity>1.0</opacity>
</end>
<sequence repeat="5000" repeatfrom="0">
<frame>98</frame>
<frame>97</frame>
<next probability="100" only="none">39</next>
</sequence>
<border>
<next probability="100" only="none">40</next>
</border>
</animation>
<animation id="40">
<name>top_walk3</name>
<start>
<x>0</x>
<y>0</y>
<interval>800</interval>
<offsety>0</offsety>
<opacity>1.0</opacity>
</start>
<end>
<x>0</x>
<y>0</y>
<interval>800</interval>
<offsety>0</offsety>
<opacity>1.0</opacity>
</end>
<sequence repeat="0" repeatfrom="0">
<frame>97</frame>
<frame>97</frame>
<action>flip</action>
<next probability="100" only="none">41</next>
</sequence>
</animation>
<animation id="41">
<name>vertical_walk_down</name>
<start>
<x>0</x>
<y>2</y>
<interval>150</interval>
<offsety>0</offsety>
<opacity>1.0</opacity>
</start>
<end>
<x>0</x>
<y>2</y>
<interval>150</interval>
<offsety>0</offsety>
<opacity>1.0</opacity>
</end>
<sequence repeat="5000" repeatfrom="0">
<frame>19</frame>
<frame>20</frame>
<next probability="100" only="none">41</next>
</sequence>
<border>
<next probability="100" only="none">42</next>
</border>
</animation>
<animation id="42">
<name>vertical_walk_over</name>
<start>
<x>0</x>
<y>0</y>
<interval>200</interval>
<offsety>0</offsety>
<opacity>1.0</opacity>
</start>
<end>
<x>0</x>
<y>0</y>
<interval>200</interval>
<offsety>0</offsety>
<opacity>1.0</opacity>
</end>
<sequence repeat="0" repeatfrom="0">
<frame>24</frame>
<frame>6</frame>
<frame>6</frame>
<frame>6</frame>
<frame>6</frame>
<frame>6</frame>
<next probability="100" only="none">1</next>
</sequence>
</animation>
<animation id="43">
<name>look_down</name>
<start>
<x>0</x>
<y>0</y>
<interval>120</interval>
<offsety>0</offsety>
<opacity>1.0</opacity>
</start>
<end>
<x>0</x>
<y>0</y>
<interval>120</interval>
<offsety>0</offsety>
<opacity>1.0</opacity>
</end>
<sequence repeat="0" repeatfrom="0">
<frame>6</frame>
<frame>78</frame>
<frame>78</frame>
<frame>78</frame>
<frame>79</frame>
<frame>80</frame>
<frame>79</frame>
<frame>78</frame>
<frame>78</frame>
<frame>78</frame>
<frame>78</frame>
<frame>78</frame>
<next probability="50" only="none">2</next>
<next probability="40" only="none">44</next>
<next probability="40" only="none">51</next>
</sequence>
</animation>
<animation id="44">
<name>jump_down</name>
<start>
<x>-5</x>
<y>-10</y>
<interval>150</interval>
<offsety>0</offsety>
<opacity>1.0</opacity>
</start>
<end>
<x>-20</x>
<y>10</y>
<interval>150</interval>
<offsety>0</offsety>
<opacity>1.0</opacity>
</end>
<sequence repeat="0" repeatfrom="0">
<frame>31</frame>
<frame>30</frame>
<frame>30</frame>
<frame>4</frame>
<frame>4</frame>
<frame>4</frame>
<frame>21</frame>
<frame>25</frame>
<next probability="100" only="none">45</next>
</sequence>
</animation>
<animation id="45">
<name>jump_down2</name>
<start>
<x>0</x>
<y>10</y>
<interval>50</interval>
<offsety>0</offsety>
<opacity>1.0</opacity>
</start>
<end>
<x>0</x>
<y>10</y>
<interval>50</interval>
<offsety>0</offsety>
<opacity>1.0</opacity>
</end>
<sequence repeat="100" repeatfrom="0">
<frame>25</frame>
<frame>25</frame>
<next probability="100" only="none">45</next>
</sequence>
<border>
<next probability="100" only="none">46</next>
</border>
</animation>
<animation id="46">
<name>jump_down3</name>
<start>
<x>0</x>
<y>0</y>
<interval>50</interval>
<offsety>0</offsety>
<opacity>1.0</opacity>
</start>
<end>
<x>0</x>
<y>0</y>
<interval>200</interval>
<offsety>0</offsety>
<opacity>1.0</opacity>
</end>
<sequence repeat="0" repeatfrom="0">
<frame>24</frame>
<frame>23</frame>
<frame>23</frame>
<frame>23</frame>
<frame>23</frame>
<frame>23</frame>
<frame>31</frame>
<frame>3</frame>
<frame>3</frame>
<frame>3</frame>
<frame>3</frame>
<next probability="100" only="none">1</next>
</sequence>
</animation>
<animation id="47">
<name>bathc</name>
<start>
<x>0</x>
<y>0</y>
<interval>100</interval>
<offsety>0</offsety>
<opacity>1.0</opacity>
</start>
<end>
<x>0</x>
<y>0</y>
<interval>100</interval>
<offsety>0</offsety>
<opacity>1.0</opacity>
</end>
<sequence repeat="0" repeatfrom="0">
<frame>169</frame>
<frame>169</frame>
<frame>169</frame>
<frame>170</frame>
<frame>171</frame>
<frame>170</frame>
<frame>169</frame>
<frame>169</frame>
<next probability="100" only="none">48</next>
</sequence>
</animation>
<animation id="48">
<name>bathd</name>
<start>
<x>0</x>
<y>0</y>
<interval>100</interval>
<offsety>-20</offsety>
<opacity>1.0</opacity>
</start>
<end>
<x>0</x>
<y>0</y>
<interval>100</interval>
<offsety>0</offsety>
<opacity>1.0</opacity>
</end>
<sequence repeat="0" repeatfrom="0">
<frame>119</frame>
<frame>81</frame>
<frame>81</frame>
<frame>82</frame>
<frame>82</frame>
<frame>10</frame>
<next probability="100" only="none">3</next>
</sequence>
</animation>
<animation id="49">
<name>walk_win2</name>
<start>
<x>-2</x>
<y>0</y>
<interval>200</interval>
<offsety>0</offsety>
<opacity>1.0</opacity>
</start>
<end>
<x>-2</x>
<y>0</y>
<interval>200</interval>
<offsety>0</offsety>
<opacity>1.0</opacity>
</end>
<sequence repeat="10" repeatfrom="0">
<frame>2</frame>
<frame>3</frame>
<next probability="10" only="none">19</next>
<next probability="3" only="none">17</next>
<next probability="80" only="none">1</next>
</sequence>
<border>
<next probability="100" only="none">2</next>
<next probability="2" only="vertical">37</next>
<next probability="20" only="window">43</next>
</border>
<gravity>
<next probability="100" only="none">5</next>
</gravity>
</animation>
<animation id="50">
<name>walk_task2</name>
<start>
<x>-2</x>
<y>0</y>
<interval>200</interval>
<offsety>0</offsety>
<opacity>1.0</opacity>
</start>
<end>
<x>-2</x>
<y>0</y>
<interval>200</interval>
<offsety>0</offsety>
<opacity>1.0</opacity>
</end>
<sequence repeat="10" repeatfrom="0">
<frame>2</frame>
<frame>3</frame>
<next probability="10" only="none">19</next>
<next probability="3" only="none">17</next>
<next probability="80" only="none">1</next>
</sequence>
<border>
<next probability="100" only="none">2</next>
<next probability="2" only="vertical">37</next>
<next probability="20" only="window">43</next>
</border>
<gravity>
<next probability="100" only="none">1</next>
</gravity>
</animation>
<animation id="51">
<name>fall_wina</name>
<start>
<x>-imageW*0.7</x>
<y>imageH*0.45</y>
<interval>100</interval>
<offsety>0</offsety>
<opacity>1.0</opacity>
</start>
<end>
<x>0</x>
<y>0</y>
<interval>100</interval>
<offsety>0</offsety>
<opacity>1.0</opacity>
</end>
<sequence repeat="0" repeatfrom="0">
<frame>77</frame>
<action>flip</action>
<next probability="100" only="none">52</next>
</sequence>
</animation>
<animation id="52">
<name>fall_winb</name>
<start>
<x>0</x>
<y>0</y>
<interval>100</interval>
<offsety>0</offsety>
<opacity>1.0</opacity>
</start>
<end>
<x>0</x>
<y>1</y>
<interval>100</interval>
<offsety>0</offsety>
<opacity>1.0</opacity>
</end>
<sequence repeat="10+random/10" repeatfrom="0">
<frame>40</frame>
<frame>41</frame>
<next probability="100" only="none">53</next>
</sequence>
</animation>
<animation id="53">
<name>fall_winc</name>
<start>
<x>0</x>
<y>4</y>
<interval>50</interval>
<offsety>0</offsety>
<opacity>1.0</opacity>
</start>
<end>
<x>0</x>
<y>20</y>
<interval>50</interval>
<offsety>0</offsety>
<opacity>1.0</opacity>
</end>
<sequence repeat="300" repeatfrom="0">
<frame>29</frame>
<frame>29</frame>
<next probability="100" only="none">53</next>
</sequence>
<border>
<next probability="100" only="none">54</next>
</border>
</animation>
<animation id="54">
<name>fall_wind</name>
<start>
<x>0</x>
<y>0</y>
<interval>500</interval>
<offsety>0</offsety>
<opacity>1.0</opacity>
</start>
<end>
<x>0</x>
<y>0</y>
<interval>500</interval>
<offsety>0</offsety>
<opacity>1.0</opacity>
</end>
<sequence repeat="0" repeatfrom="0">
<frame>45</frame>
<frame>45</frame>
<frame>18</frame>
<frame>76</frame>
<frame>6</frame>
<next probability="100" only="none">1</next>
</sequence>
</animation>
</animations>
<childs>
<child animationid="21">
<x>screenW+10-areaH/2-(randS*areaH/2)/120</x>
<y>areaH-imageH</y>
<next>23</next>
</child>
<child animationid="26">
<x>imageX-imageW*0.9</x>
<y>imageY</y>
<next>27</next>
</child>
<child animationid="28">
<x>-imageW</x>
<y>imageY</y>
<next>31</next>
</child>
</childs>
</animations>`;
