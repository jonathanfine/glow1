t.module("glow.anim");

t.test("glow.anim.Animation events", function() {
	t.expect(7);
	var events = glow.events;
	var anim = new glow.anim.Animation(1);
	var frameCount = 0;
	var haveStopped = false;

	t.stop();

	events.addListener(anim, "start", function() {
		t.ok(true, "Start fired");
	});
	events.addListener(anim, "stop", function() {
		t.ok(true, "Stop fired");
	});
	events.addListener(anim, "resume", function() {
		t.ok(true, "Resume fired");
	});
	events.addListener(anim, "frame", function() {
		frameCount++;
		if (this.position > 0.5 && !haveStopped) {
			t.equals(this.isPlaying(), true, "isPlaying()");
			this.stop();
			haveStopped = true;
			t.equals(this.isPlaying(), false, "isPlaying()");
			this.resume();
		}
	});
	events.addListener(anim, "complete", function() {
		t.ok(true, "Animation completed");
		t.ok(frameCount > 1, "Done " + frameCount + " frames");
		t.start();
	});

	anim.start();
});

t.test("glow.anim.Animation goTo", function() {
	t.expect(3);
	var events = glow.events;
	var anim = new glow.anim.Animation(1);

	events.addListener(anim, "start", function() {
		t.ok(false, "Start shouldn't fire");
	});

	events.addListener(anim, "resume", function() {
		t.ok(true, "Resume fired");
		t.equals(this.position, 0.5, "Position");
		t.equals(this.value, 0.5, "Value");
	});

	anim.goTo(0.5).resume();
	anim.stop();
});

t.test("glow.anim.fadeOut fadeOut", function() {
	t.expect(3);
	var events = glow.events;
	var elm = glow.dom.get("#fadeout");
	elm.css("opacity", 1);
	t.stop();

	glow.anim.fadeOut(elm, 0.1, {
		onStart: function(){
			t.ok(true, "Start fired") ;
		},
		onComplete: function(){
			t.ok(true, "Complete fired");
			t.equals(elm.css("opacity"), 0, "Opacity");
			t.start();
		}
	});

});

t.test("glow.anim.fadeIn fadeIn", function() {
	t.expect(3);
	var events = glow.events;
	var elm = glow.dom.get("#fadeout");
	elm.css("opacity", 0);
	t.stop();

	glow.anim.fadeIn(elm, 0.1, {
		onStart: function(){
			t.ok(true, "Start fired");
		},
		onComplete: function(){
			t.ok(true, "Complete fired");
			t.equals(elm.css("opacity"), 1, "Opacity");
			t.start();
		}
	});

});

t.test("glow.anim.highlight highlight", function() {
	t.expect(4);
	var events = glow.events;
	var elm = glow.dom.get("#fadeout");
	t.stop();

	glow.anim.highlight(elm, '', 0.3, {
		onStart: function(){
			t.ok(true, "Start fired");
			t.equals(elm.css("background-color"), "transparent", "Highlight Color");
		},
		onComplete: function(){
			t.ok(true, "Complete fired");
			t.equals(elm.css("background-color"), "rgb(255, 255, 255)", "Complete Color");
			t.start();
		}
	});
});

t.test("glow.anim.SlideUp SlideUp", function() {
	t.expect(4);
	var events = glow.events;
	var elm = glow.dom.get("#slideup");
	t.stop();

	glow.anim.slideUp(elm, 0.1, {
		onStart: function(){
			t.ok(true, "Start fired");
			t.equals(elm.css("height"), "28px", "Start height");
		},
		onComplete: function(){
			t.ok(true, "Complete fired");
			t.equals(elm.css("height"), "0px", "Completed height");
			t.start();
		}
	});
});

t.test("glow.anim.SlideDown SlideDown", function() {
	t.expect(3);

	var elm = glow.dom.get("#slidedown");
	elm.css("height", 0).css("overflow", "hidden");
	t.stop();

	glow.anim.slideDown(elm, 0.1, {
		onStart: function(){
			t.ok(true, "Start fired");
			t.equals(elm.css("height"), "0px", "Start height");
		},
		onComplete: function(){
			t.ok(true, "Complete fired");
			t.start();
		}
	});
});
