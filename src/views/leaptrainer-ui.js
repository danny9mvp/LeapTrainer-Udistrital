/*!
 * The MIT License (MIT)
 * 
 * Copyright (c) 2013 Robert O'Leary
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 * 
 * ------------------------------ NOTE ----------------------------------
 *
 * The positionPalm and positionFinger functions, as well as the structure of the leap 
 * controller listener below, are based on code from jestPlay (also under the MIT license), by Theo Armour:
 * 
 * 	http://jaanga.github.io/gestification/cookbook/jest-play/r1/jest-play.html
 * 
 * Thanks Theo!
 * 
 * ----------------------------------------------------------------------
 * 
 *  
 * Table of contents
 * ---------------------------
 * 
 * 	1. Basic Initialization
 *	2. Setting up the options panel
 *	3. Setting up the overlay
 * 	4. Handling window resize events
 *	5. Setting up the gesture creation form
 *	6. Utility interface modification functions
 *	7. Training event listeners
 *	8. Leap controller event listeners
 *	9. WebGL rendering functions
 *	10. And finally...
 * 
 * ---------------------------
 */
 //var Gesto = require('../app/models/gesto');
 //const mongoose = require('mongoose');
jQuery(document).ready(function ($) {


	/*
	 * ------------------------------------------------------------------------------------------
	 *  1. Basic Initialization
	 * ------------------------------------------------------------------------------------------
	 */
	
	/*
	 * First we create the leap controller - since the training UI will respond to event coming directly from the device.
	 */
	var controller = new Leap.Controller();

	/*
	 * Now we create the trainer controller, passing the leap controller as a parameter
	 */
	var trainer = new LeapTrainer.Controller({controller: controller});

	/*
	 * We get the DOM crawling done now during setup, so it's not consuming cycles at runtime.
	 */
	var win					= $(window),
		body				= $("body"),
		gestureCreationArea	= $('#gesture-creation-area'),
		creationForm		= $('#new-gesture-form'),
		existingGestureList = $("#existing-gestures"),
		newGestureName		= $('#new-gesture-name'),
		renderArea 			= $('#render-area'),
		frameRiggedHand		= $('#frameRiggedHand'),
		main				= $('#main'),
		overlayArea			= $('#overlay'),
		overlayShade		= $('#overlay-shade'),
		exportingName		= $('#exporting-gesture-name'),
		exportingSampleText = $('#exporting-gesture-sample-text'),
		exportText 			= $('#export-text'),
		retrainButton 		= $('#retrain-gesture'),
		closeOverlayButton 	= $('#close-overlay'),
		outputText			= $('#output-text'),
		optionsButton		= $('#options-button'),
		optionsArea  		= $('#options'), 
		recordingTriggers 	= $('#recording-triggers'),
		recordingStrategies = $('#recording-strategies'),
		voiceGenre 			= $('#voice-genre'),
		recogStrategies 	= $('#recognition-strategies'),
		updateConfirmation  = $('#options-update-confirmation'),
		openConfiguration 	= $('#open-configuration'),
		closeConfiguration 	= $('#close-configuration'),
		wegGlWarning		= $('#webgl-warning'),
		versionTag			= $('#version-tag'),
		forkMe				= $('#fork-me'),

		/*
		 * We set up the WebGL renderer - switching to a canvas renderer if needed
		 */
		webGl				= Detector.webgl,
		renderer 			= webGl ? new THREE.WebGLRenderer({antialias:true}) : new THREE.CanvasRenderer(),

		/*
		 * Some constant colors are declared for interface modifications
		 */
		red					= '#EE5A40',
		green				= '#AFF372',
		yellow				= '#EFF57E',
		blue				= '#AFDFF1',
		white				= '#FFFFFF',

		/*
		 * The WebGL variables, materials, and geometry
		 */
		material 			= new THREE.MeshBasicMaterial({color: white }),		// The normal material used to display hands and fingers
		recordingMaterial 	= new THREE.MeshBasicMaterial({color: yellow }),	// The material used on hands and fingers during recording
		palmGeometry 		= new THREE.CubeGeometry(60, 10, 60),				// The geometry of a palm
		fingerGeometry 		= webGl ? new THREE.SphereGeometry(5, 20, 10) : new THREE.TorusGeometry(1, 5, 5, 5), // The geometry of a finger (simplified if using a canvas renderer)

		camera 				= new THREE.PerspectiveCamera(45, 2/1, 1, 3000),
		cameraInitialPos	= new THREE.Vector3(0, 0, 450),
		scene 				= new THREE.Scene(),
		controls 			= new THREE.OrbitControls(camera, renderer.domElement),

		/*
		 * When a gesture is being rendered, not all recorded frames will necessarily be needed.  This variable controls the interval between 
		 * frames chosen for rendering.  If 21 frames are recorded and the gestureRenderInterval is 3, then just 7 frames will be rendered.
		 */
		//gestureRenderInterval = webGl ? 3 : 6,
		
		/*
		 * And finally we declare some working variables for use below
		 */
		windowHeight, 				// A holding variable for the current window height - used for calculations when the window is resized
		windowWidth, 				// The current window width
		gestureEntries 		= {},	// The list items ('LI') in the known gestures list - already jQuery-wrapped 
		progressBars 		= {},	// The colored progress bar backgrounds in the list items - also jQuery-wrapped, needed for setting widths during recognition
		gestureLabels 		= {},	// The area for text at the right of gesture list entries - displays 'LEARNED' when training completes
		gestureArrows 		= {},	// The right-pointing arrow heads associated with each gesture in the gesture list
		optionsOpen 		= false,// A toggle indicating if the options panel is currently open
		overlayOpen 		= false,// A toggle indicating if the overlay is currently open
		training 			= false,// A toggle indicating if the trainer is currently training a gesture - used to disable opening of the overlay during training
		data;

	/*
	 * If WebGL is supported the WebGL warning can be removed entirely - otherwise it should be made visible.
	 */



	if (webGl) { wegGlWarning.remove(); } else { wegGlWarning.css({display: 'block'}); }

	/*
	 * Panning is disabled as it distrupts resetting of the camera position.
	 * 
	 * TODO: Fix the resetting, rather than just disabling panning.
	 */
	controls.noPan = true;

	
  		
	/*
	 * ------------------------------------------------------------------------------------------
	 *  2. Setting up the options panel
	 * ------------------------------------------------------------------------------------------
	 */	

	/*
	 * Opening and closing of the options area is just a jQuery animate on the left style of the main area - pushing it out of view to 
	 * the right and revealing the options. 
	 */
	function openOptions (evt)  { 
		
		if (optionsOpen) { return; } 
		
		if (evt) { evt.stopPropagation(); } 
		
		optionsOpen = true;  
		
		recordingTriggers.focus(); 

		main.animate({left: -340}); 
	}

	/*
	 * 
	 */
	function closeOptions (evt) { 
		
		if (!optionsOpen) { return; } 
		
		if (evt) { evt.stopPropagation(); } 
		
		optionsOpen = false; 
		
		main.animate({left: 0}); 
	}	

	
	/*
	 * The options panel open/close functions are bound to the options button
	 */
	optionsButton.click(function(evt) { optionsOpen ? closeOptions(evt) : openOptions(evt); });
	
	/*
	 * A touch swipe handler is set on the window, opening the options on swipe left, closing them on swipe right.
	 */
	win.touchwipe({ wipeRight: closeOptions, wipeLeft: openOptions, preventDefaultEvents: false });
	
	/*
	 * When the main area is clicked it will close the option area if it's open
	 */
	main.click(closeOptions);

    /*
     * The option inputs are populated with the available trainer implementations and event listeners bound to them
     */
	function optionsUpdated() { updateConfirmation.show(); setTimeout(function() { updateConfirmation.hide(); }, 3000); }
	
	var impl, t = [], s = [], cs = [];
	
	/*
	 * This function adds an option to a select list
	 */
    function setupOptionList(rt, t, list, implName) {

    	if (rt) { rt = rt(); if (t.indexOf(rt) == -1) { t.push(rt); list.append('<option value="' + implName + '">' + rt + '</option>'); }}
    }
    
    /*
     * We populate the recording triggers, recording strategies, and recognition strategies option lists.
     */
    voiceGenre.append('<option value="' + 'Male' + '">'+'Masculino'+'</option>');
    voiceGenre.append('<option value="' + 'Female' + '">'+'Femenino'+'</option>');
    voiceGenre.change(function(){    
    	//responsiveVoice.speak(gestureName,"Spanish Latin American "+voiceGenre.val());
    });
    for (var implName in LeapTrainer) {

    	impl = LeapTrainer[implName].prototype;
    	
    	setupOptionList(impl.getRecordingTriggerStrategy, t, recordingTriggers, implName);
    	setupOptionList(impl.getFrameRecordingStrategy, s, recordingStrategies, implName);
    	setupOptionList(impl.getRecognitionStrategy, cs, recogStrategies, implName);
    }
    
    /*
     * This function merges a function from one controller class into another
     */
    function modifyController(replacementController) {
    	
    	replacementController = LeapTrainer[replacementController];
    	
    	var fields = replacementController.overidden;

    	var func;
    	
    	for (var field in fields) {

    		func = replacementController.prototype[field];

    		if (func) {

        		if (func.bind) { func.bind(trainer); }
        		
        		trainer[field] 	= func;    			
    		}
    	}

    	optionsUpdated();
    }
    
    /*
     * TODO: This is STILL AWFUL.. The functions involved in each strategy are assumed to be ALL overridden functions in the controller.. This may 
     * not be the case.  
     * 
     * This really needs to be swapped out for something more reliable!
     */
	recordingTriggers.change(function() 	{ modifyController(recordingTriggers.val()); });
	recordingStrategies.change(function() 	{ modifyController(recordingStrategies.val()); });
	recogStrategies.change(function() 		{ modifyController(recogStrategies.val()); });

	/*
	 * This function updates a variable in the controller with a new value from one of the option input boxes.
	 * 
	 * TODO: Still.. Some input validation would be useful here - or in some cases, more restrictive inputs - sliders for the numbers, etc.
	 */
    function setupOptionInput(binding) {
    	
    	var input 	= $('#' + binding);

    	input.val(trainer[binding]);
    	
    	input.blur(function() {
    		
    		var val = input.val();
    		
    		if (val != trainer[binding]) { trainer[binding] = val; optionsUpdated(); }
    	});
    }
    
    setupOptionInput('minRecordingVelocity');
    setupOptionInput('maxRecordingVelocity');
    setupOptionInput('minGestureFrames');
    setupOptionInput('minPoseFrames');
    setupOptionInput('hitThreshold');
    setupOptionInput('trainingGestures');
    setupOptionInput('convolutionFactor');
    setupOptionInput('downtime');
    
    /*
     * Now we set up the interface configuration drop-downs, which can be used to bind gestures to interface operations
     */
    var openConfigGesture = null, closeConfigGesture = null;
    
    function registerUIGesture (oldGesture, newGesture, func) { trainer.off(oldGesture, func); trainer.on(newGesture, func); optionsUpdated(); return newGesture; }

	openConfiguration.change(function()  { openConfigGesture  = registerUIGesture(openConfigGesture, openConfiguration.val(), openOptions); });
	closeConfiguration.change(function() { closeConfigGesture = registerUIGesture(closeConfigGesture, closeConfiguration.val(), closeOptions); });

	/*
	 * ------------------------------------------------------------------------------------------
	 *  3. Setting up the overlay
	 * ------------------------------------------------------------------------------------------
	 */
    
	/**
	 * Opens the overlay.
	 * 
	 * The overlay is opened and closed by just adding an 'overlay-open' class to the body tag.  The selected gesture 
	 * in the gesture list is modified to be full width and display its arrow pointing at the overlay.  The content of 
	 * the overlay is set as appropriate for the selected gesture.
	 */
	function openExportOverlay(listItem, gestureName) {

		if (overlayOpen || training) { return; } // If a gesture is currently in training, the overlay can't be opened

		trainer.pause(); // While the overlay is open, the training controller is inactive.
		
		main.css({position: 'inherit'});
		
		var bar = progressBars[gestureName];

		bar.css({width: '100%', background: blue});

		setGestureLabel(gestureName, '');
		
		existingGestureList.find('li').removeClass('selected');
		
	    listItem.addClass('selected');

	    exportingName.html(gestureName);
	    
	    var json = trainer.toJSON(gestureName); // The JSON is extracted from the controller
	    //alert(json);
	    exportingSampleText.html((json.length > 60 ? json.substring(0, 60) : json) + '...');

	    exportText.html(json);

	    body.addClass('overlay-open'); // This is what makes the overlay and the shade visible
	    
		overlayOpen = true;

	    exportText.css({height: overlayArea.height() - (overlayArea.children()[0].clientHeight + 150)});
	};
	
	/**
	 * Closes the overlay. The selected gesture to returned to as it was before the overlay opened.
	 */
	function closeExportOverlay() {
		
		if (!overlayOpen) { return; }		
		
		trainer.resume();

		main.css({position: 'fixed'});

		unselectAllGestures(true);
		
		existingGestureList.find('li').removeClass('selected');

		body.removeClass('overlay-open'); // This is what makes the overlay and shade invisible again.
		
		overlayOpen = false;
	};    
    
    /*
     * When the retrain button is clicked the overlay closes and the leaptrainer retrain() function is called for the selected gesture
     */
    retrainButton.click(function() { closeExportOverlay(); trainer.retrain(exportingName.html()); });
    
    closeOverlayButton.click(closeExportOverlay); // Clicking on the close button closes the overlay

    overlayShade.on('click', function (e) { if (body.hasClass('overlay-open')) { closeExportOverlay(); } }); // Clicking anywhere on the overlay shade closes the overlay

    $(document).on('keydown', function (e) { if (e.keyCode === 27 ) { closeExportOverlay(); }}); // Pressing the ESC key closes the overlay
    
    /*
     * Clicking on the export textarea causes all the text contained in it to be selected.  This way one needs only click on the textarea and 
     * then CTRL+C (or whatever copy is on your system) to extract the JSON.
     */
    exportText.click(function() { this.focus(); this.select(); });
    

	/*
	 * ------------------------------------------------------------------------------------------
	 *  4. Handling window resize events
	 * ------------------------------------------------------------------------------------------
	 */

    /*
	 * When the window resizes we update: 
	 * 
	 * 	- The dimensions of the three.js render area
	 *  - The font size, left offset, and width of the output text at the top of the screen (to try to ensure it's visible even when the window gets very small)
	 * 	- The height of the main area, options panel, and overlay shade (to ensure they're all always 100% of the screen height)
	 *  - The size and position of the export/retrain overlay and its contents.
	 */
	function updateDimensions() {

		windowHeight 		= win.innerHeight();
		windowWidth 		= win.innerWidth();
		
		overlayShade.css	({height: windowHeight});
		optionsArea.css		({height: windowHeight});
		main.css			({height: windowHeight});

		/*
		 * The three.js area and renderer are resized to fit the page
		 */
		var renderHeight 	= windowHeight - 5;

		renderArea.css({width: windowWidth, height: renderHeight});

		//frameRiggedHand.height(windowHeight);
		//frameRiggedHand.width(windowWidth);

		renderer.setSize(windowWidth, renderHeight);

		/*
		 * When window drops below a given width , the output text is no longer centered on the screen - because if it is, it's likely 
		 * to end up behind the gesture creation input or button.  Instead, it's pushed over to the left somewhat in order to clear the gesture 
		 * creation form as much as possible.
		 */
		var outputTextLeft = (windowWidth < 1000) ? 100 : 22; 

		/*
		 * The font of the output text is also scaled with the window width
		 */
		outputText.css({left: outputTextLeft, width: windowWidth - outputTextLeft - 22, fontSize: Math.max(22, windowWidth/55)});

		/*
		 * The export/retrain overlay is always nearly as tall as the window, and wide enough to fill most of the window without covering
		 * the gesture list.
		 */
		overlayArea.css({width: windowWidth - 480, height: windowHeight * 0.88});

		exportText.css({height: overlayArea.height() - (overlayArea.children()[0].clientHeight + 150)}); // The export textarea stretches vertically
	}			
	
	/*
	 * We fire the dimensions update once to set up the correct initial dimensions.
	 */
	updateDimensions();

	/*
	 * And then bind the update function to window resize events.
	 */
	win.resize(updateDimensions);	
	
	
	/*
	 * ------------------------------------------------------------------------------------------
	 *  5. Setting up the gesture creation form
	 * ------------------------------------------------------------------------------------------
	 */

	/*
	 * The gesture name input should be cleared on focus and reset to the default if it's empty on blur.
	 * 
	 * So we set the default as a data attribute on the element
	 */
	newGestureName.data('default-text', newGestureName.val());

	/*
	 * And then bind focus and blur listeners
	 */
	newGestureName.focus(function() {

	    if ($(this).val() != '' && $(this).val() == $(this).data('default-text')) $(this).val("");
	
	}).blur(function(){ if ($(this).val() == "") $(this).val($(this).data('default-text')); });			
	
	/*
	 * The gesture creation form should fire a script when submit, rather than actually submit to a URL - so we bind a 
	 * function to the submit event which returns false in order to prevent the event propagating.
	 * 
	 * Regardless of whether a gesture is created or not, the form shouldn't submit - so this function always returns FALSE.
	 */
	creationForm.submit(function() { 

		var name = newGestureName.val().trim();

		/*
		 * If the input name is empty, the default on the box, or already exists in the list of existing gestures, we just do nothing and return.
		 * 
		 * TODO: Some sort of feedback on what happened here would be nice.
		 */
		if (name.length == 0 || name == newGestureName.data("default-text") || trainer.gestures[name] != null) { return false; }

		/*
		 * And then we create the new gesture in the trainer and return false to prevent the form submission event propagating. 
		 * 
		 * The gesture name is upper-cased for uniformity (TODO: This shouldn't really be a requirement).
		 */
		trainer.create(name.toUpperCase());
		
		return false;
	});

	
	/*
	 * ------------------------------------------------------------------------------------------
	 *  6. Utility interface modification functions
	 * ------------------------------------------------------------------------------------------
	 */

	/**
	 * Sets the output text at the top of the screen.  If no parameter is passed, the text is set to an empty string.
	 */
	function setOutputText(text) { outputText.html(text ? text : ''); };

	/**
	 * Clears all selections and highlights in the gesture list.  If a parameter is passed all progress bars in the list will also be reset.
	 */
	function unselectAllGestures(resetProgressBars) {		

		if (resetProgressBars) {
			
			for (arrow in gestureArrows) { gestureArrows[arrow].css({background: 'transparent'}); }
			
			var bar;
			
			for (barName in progressBars) { 
				
				bar = progressBars[barName];
				
				bar.css({width: '0%', background: blue});
				
				bar.parent().removeClass('selected'); 
			}			
		}

		for (label in gestureLabels) { gestureLabels[label].html('&nbsp;'); }
	}
	
	/**
	 * Sets the width of the progress bar on a single gesture in the gesture list.  
	 * 
	 * This function uses standard-issue jQuery animation to tween the width on the bar up or down.
	 */
	function setGestureScale(gestureName, val, color, arrowColor) {		

		gestureArrows[gestureName].css({display: arrowColor == 'transparent' ? 'none' : 'block', background: arrowColor});

		var bar = progressBars[gestureName];

		bar.css({background: color});

		bar.animate({width: val + '%'}, 200, 'swing');
	}
	
	/**
	 * Updates all progress bars in the list with a list of hits output by the trainer.
	 * 
	 * If the second parameter is provided one gesture will be excluded - the gesture that 
	 * has hit - since the update on that entry will be different (color change, etc).
	 */
	function setAllGestureScales(allHits, excluding) {		

		for (var gestureName in allHits) {  
			
			if (gestureName == excluding) { continue; }
			
			setGestureLabel(gestureName);

			setGestureScale(gestureName, Math.min(parseInt(100 * allHits[gestureName]), 100), blue, 'transparent');
		}
	}
	
	/**
	 * Sets the text at the right of a gesture list entry
	 */
	function setGestureLabel(gestureName, val) { gestureLabels[gestureName].html(val ? val : '&nbsp;'); }

	/**
	 * Updates the whole interface to a disabled state.  This function is used when the connection to the Leap Motion is lost.
	 */
	function disableUI(color, message) {
		
		main.css({background: color});
		
		gestureCreationArea.css({display: 'none'});
		optionsButton	   .css({display: 'none'});
		versionTag		   .css({display: 'none'});
		forkMe			   .css({display: 'none'});
		
		outputText.css({background: 'transparent'});		
		
		setOutputText(message);
	}	
	
	/**
	 * Re-enables the UI after it has been disabled.
	 */
	function enableUI(message) {
		
		main.css({background: ''});
		
		gestureCreationArea.css({display: ''});
		optionsButton	   .css({display: ''});
		versionTag		   .css({display: ''});
		forkMe			   .css({display: ''});
		
		outputText.css({background: ''});
		
		setOutputText(message);
	}	
	
	/*
	 * ------------------------------------------------------------------------------------------
	 *  7. Training event listeners
	 * ------------------------------------------------------------------------------------------
	 */

	/*
	 * When a new gesture is created by the trainer, an entry is added to the gestures list.




	
*/

	
	 

	trainer.on('gesture-created', function(gestureName, trainingSkipped) {
		
		/*
		 * Since a new gesture is being created, we need to add an entry in the gesture list
		 
		$.ajax({
                url: "data.json",
                type: "POST",
                cache: false,
                success: function(gestureName){

        */
                	var gesture = $('<li' + (trainingSkipped ? '' : ' class="selected"') +'><div class="progress"><span class="gesture-name">'+gestureName+'</span><img class="arrow" src="./trainer-ui/images/training-arrow.png" /></div>' + 
									'<img class="export-arrow" src="./trainer-ui/images/export-arrow.png" />' + 
									'<span class="label">&nbsp;</span></li>');

					gesture.click(function() { openExportOverlay(gesture, gestureName); }); //Clicking on the gesture will open the export/retrain overlay
					
					var items = existingGestureList.find('li');
					
					if (items.length == 0) {
						
						existingGestureList.append(gesture);
						
					} else {

						/*
						 * If there are already other gestures in the list we make sure to unselect any currently selected.
						 */
						unselectAllGestures(true);

						$("#existing-gestures li").first().before(gesture);
						
					}

					/*
					 * Wrapped references to the new DOM elements added are stored
					 */
					gestureEntries[gestureName]	= $(gesture[0]);
					progressBars[gestureName] 	= $(gesture.find('.progress')[0]);
					gestureLabels[gestureName] 	= $(gesture.find('.label')[0]);
					gestureArrows[gestureName] 	= $(gesture.find('.progress .arrow')[0]);
					
					/*
					 * We reset the input box
					 */
					newGestureName.val('');
					newGestureName.blur();
					var jsonnnn = trainer.toJSON(gestureName);
					//console.log(gesture);
					//console.log(gestureName);
					/*
					 * Finally we add the new gesture to the interface configuration option lists, so that the new gesture 
					 * can be selected to associate it with interface functions.
					 */
				    openConfiguration.append('<option value="' + gestureName + '">' + gestureName + '</option>');
				    
				    closeConfiguration.append('<option value="' + gestureName + '">' + gestureName + '</option>');




				/*
                error: function(gestureName){
                    console.log(gestureName);
                }
            });*/


	});








	/*
	 * During a training countdown we update the output text. 
	 */
	trainer.on('training-countdown', function(countdown) {
		
		training = true;
		
		setOutputText('Comenzando entrenamiento en ' + countdown + ' segundo' + (countdown > 1 ? 's' : ''));
	});

	/*
	 * When training starts we reset the gesture progress bar, show the arrow on the gesture list entry, and change the progress bar to yellow.
	 * The output text is updated to display how many training gestures need to be performed.
	 */
	trainer.on('training-started', function(gestureName) {

		gestureArrows[gestureName].css({display: 'block'});

		var trainingGestureCount = trainer.trainingGestures;
		
		setOutputText('Replique el gesto o pose \'' + gestureName + '\' ' + (trainingGestureCount > 1 ? trainingGestureCount + ' veces' : ''));

		gestureEntries[gestureName].css({background: 'transparent'});		
		
		setGestureLabel(gestureName);
		
		setGestureScale(gestureName, 1, yellow, yellow);
	});

	/*
	 * When a training gesture is successfully saved, we render the gesture, update the progress bar on the gesture list entry, and 
	 * update the output text to display how many more gestures need to be performed.
	 */
	trainer.on('training-gesture-saved', function(gestureName, trainingSet) {

		var trainingGestures = trainer.trainingGestures;		
		
		var remaining = (trainingGestures - trainingSet.length);

		setGestureScale(gestureName, 100 - ((100/trainingGestures) * remaining), yellow, yellow);

		setOutputText('Replique el gesto ' + gestureName + ' ' + (remaining == 1 ? ' una vez más.' : remaining + ' veces más.'));
	});
	
	/*
	 * When training completes we render the final training gesture, update the output text and gesture label, and set the gesture scale to 
	 * 100% and green.
	 */
	trainer.on('training-complete', function(gestureName, trainingSet, isPose) {

		training = false;						

		setOutputText(gestureName + (isPose ? ' pose aprendida!' : ' gesto aprendido!'));

		setGestureLabel(gestureName, 'Aprendido');
		
		setGestureScale(gestureName, 100, green, green);

		var arrages= {name:gestureName,pose : isPose,data:trainingSet};

		var jj = JSON.stringify(trainingSet);
		guarbase(gestureName,isPose,jj);
		
	});
	
	function guarbase(arrages,isPose,jj) {

		$.ajax({
                url: '/add',
                type: 'POST',
                data: 'name='+arrages+'&pose='+isPose+'&data='+jj,

            })
                .done(function (data) {
                	if (data==1) {
                		//alert("sisa");
                		llenar();
                	}
                  
            })
            .fail(function () {
                console.log("error");
            });		
    
  	}; 

  	


	/*
	 * When a known gesture is recognised we select it in the gesture list, render it, update the gesture list entry progress bar to 
	 * match the hit value, and set the output text.
	 */
	trainer.on('gesture-recognized', function(hit, gestureName, allHits) {

		unselectAllGestures(false);

		setAllGestureScales(allHits, gestureName);		
		
		var hitPercentage = Math.min(parseInt(100 * hit), 100);

		setGestureScale(gestureName, hitPercentage, green, green);

		setOutputText('<span style="font-weight: bold">' + gestureName + '</span> : ' + hitPercentage + '% DE ACIERTO');

		responsiveVoice.speak(gestureName,"Spanish Latin American "+voiceGenre.val());
	});	

	/*
	 * When an unknown gesture is recorded we unselect all gestures in the list, update all gesture progress bars with the list of hit 
	 * values that did come back (all of which will be below trainer.hitThreshold) and empty the output text.  We also clear any currently 
	 * rendered gesture.
	 */
	trainer.on('gesture-unknown', function(allHits) {

		unselectAllGestures(false);
		
		setOutputText();
		
		setAllGestureScales(allHits);
		
	});

	/*
	 * ------------------------------------------------------------------------------------------
	 *  8. Leap controller event listeners
	 * ------------------------------------------------------------------------------------------
	 */

	/*
	 * When the controller connects to the Leap web service we update the output text
	 */
	controller.on('connect', function() { setOutputText('Haz un gesto o pose con la mano para comenzar'); });

	/*
	 * BLUR and FOCUS event listeners can be added in order to display that the trainer is no longer listening for 
	 * input when the browser window blurs.
	 * 
	 * Currently these listeners are not enabled by default, since it seems intrusive.
	 */
	//controller.on('blur',	 function() { disableUI('#DDD'); setOutputText('Focus lost'); });
	//controller.on('focus', function() { enableUI(); 		 setOutputText('Focus regained');}); 	

	/*
	 * When the connection to the Leap is lost we set the output text and disable the UI, making the background an alarming RED.
	 */
	controller.on('deviceDisconnected', function() { disableUI(red, '¡DESCONECTADO!  Revisa la conexión de tu Leap Motion'); });
	
	/*
	 * When the connection to the Leap is restored, we re-enable the UI. 
	 */
	controller.on('deviceConnected', function() { enableUI('¡Conexión restablecida!'); });


	
	/*
	 * ------------------------------------------------------------------------------------------
	 *  10. And finally...
	 * ------------------------------------------------------------------------------------------
	 */

	/*
	 * And finally we connect to the device
	 */
	controller.use('boneHand',{
  			targetEl: document.getElementById('render-area')  						
  		}).connect();
});
