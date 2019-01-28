/*
    A simple jQuery modal (http://github.com/kylefox/jquery-modal)
    Version 0.9.1
*/

(function (factory) {
  // Making your jQuery plugin work better with npm tools
  // http://blog.npmjs.org/post/112712169830/making-your-jquery-plugin-work-better-with-npm
  if(typeof module === "object" && typeof module.exports === "object") {
    factory(require("jquery"), window, document);
  }
  else {
    factory(jQuery, window, document);
  }
}(function($, window, document, undefined) {

  var modals = [],
      getCurrent = function() {
        return modals.length ? modals[modals.length - 1] : null;
      },
      selectCurrent = function() {
        var i,
            selected = false;
        for (i=modals.length-1; i>=0; i--) {
          if (modals[i].$blocker) {
            modals[i].$blocker.toggleClass('current',!selected).toggleClass('behind',selected);
            selected = true;
          }
        }
      };

  $.modalj = function(el, options) {
    var remove, target;
    this.$body = $('body');
    this.options = $.extend({}, $.modalj.defaults, options);
    this.options.doFade = !isNaN(parseInt(this.options.fadeDuration, 10));
    this.$blocker = null;
    if (this.options.closeExisting)
      while ($.modalj.isActive())
        $.modalj.close(); // Close any open modals.
    modals.push(this);
    if (el.is('a')) {
      target = el.attr('href');
      this.anchor = el;
      //Select element by id from href
      if (/^#/.test(target)) {
        this.$elm = $(target);
        if (this.$elm.length !== 1) return null;
        this.$body.append(this.$elm);
        this.open();
      //AJAX
      } else {
        this.$elm = $('<div>');
        this.$body.append(this.$elm);
        remove = function(event, modal) { modal.elm.remove(); };
        this.showSpinner();
        el.trigger($.modalj.AJAX_SEND);
        $.get(target).done(function(html) {
          if (!$.modalj.isActive()) return;
          el.trigger($.modalj.AJAX_SUCCESS);
          var current = getCurrent();
          current.$elm.empty().append(html).on($.modalj.CLOSE, remove);
          current.hideSpinner();
          current.open();
          el.trigger($.modalj.AJAX_COMPLETE);
        }).fail(function() {
          el.trigger($.modalj.AJAX_FAIL);
          var current = getCurrent();
          current.hideSpinner();
          modals.pop(); // remove expected modal from the list
          el.trigger($.modalj.AJAX_COMPLETE);
        });
      }
    } else {
      this.$elm = el;
      this.anchor = el;
      this.$body.append(this.$elm);
      this.open();
    }
  };

  $.modalj.prototype = {
    constructor: $.modalj,

    open: function() {
      var m = this;
      this.block();
      this.anchor.blur();
      if(this.options.doFade) {
        setTimeout(function() {
          m.show();
        }, this.options.fadeDuration * this.options.fadeDelay);
      } else {
        this.show();
      }
      $(document).off('keydown.jmodal').on('keydown.jmodal', function(event) {
        var current = getCurrent();
        if (event.which === 27 && current.options.escapeClose) current.close();
      });
      if (this.options.clickClose)
        this.$blocker.click(function(e) {
          if (e.target === this)
            $.modalj.close();
        });
    },

    close: function() {
      modals.pop();
      this.unblock();
      this.hide();
      if (!$.modalj.isActive())
        $(document).off('keydown.jmodal');
    },

    block: function() {
      this.$elm.trigger($.modalj.BEFORE_BLOCK, [this._ctx()]);
      this.$body.css('overflow','hidden');
      this.$blocker = $('<div class="' + this.options.blockerClass + ' blocker current"></div>').appendTo(this.$body);
      selectCurrent();
      if(this.options.doFade) {
        this.$blocker.css('opacity',0).animate({opacity: 1}, this.options.fadeDuration);
      }
      this.$elm.trigger($.modalj.BLOCK, [this._ctx()]);
    },

    unblock: function(now) {
      if (!now && this.options.doFade)
        this.$blocker.fadeOut(this.options.fadeDuration, this.unblock.bind(this,true));
      else {
        this.$blocker.children().appendTo(this.$body);
        this.$blocker.remove();
        this.$blocker = null;
        selectCurrent();
        if (!$.modalj.isActive())
          this.$body.css('overflow','');
      }
    },

    show: function() {
      this.$elm.trigger($.modalj.BEFORE_OPEN, [this._ctx()]);
      if (this.options.showClose) {
        this.closeButton = $('<a href="#close-jmodal" rel="jmodal:close" class="close-jmodal ' + this.options.closeClass + '">' + this.options.closeText + '</a>');
        this.$elm.append(this.closeButton);
      }
      this.$elm.addClass(this.options.modalClass).appendTo(this.$blocker);
      if(this.options.doFade) {
        this.$elm.css({opacity: 0, display: 'inline-block'}).animate({opacity: 1}, this.options.fadeDuration);
      } else {
        this.$elm.css('display', 'inline-block');
      }
      this.$elm.trigger($.modalj.OPEN, [this._ctx()]);
    },

    hide: function() {
      this.$elm.trigger($.modalj.BEFORE_CLOSE, [this._ctx()]);
      if (this.closeButton) this.closeButton.remove();
      var _this = this;
      if(this.options.doFade) {
        this.$elm.fadeOut(this.options.fadeDuration, function () {
          _this.$elm.trigger($.modalj.AFTER_CLOSE, [_this._ctx()]);
        });
      } else {
        this.$elm.hide(0, function () {
          _this.$elm.trigger($.modalj.AFTER_CLOSE, [_this._ctx()]);
        });
      }
      this.$elm.trigger($.modalj.CLOSE, [this._ctx()]);
    },

    showSpinner: function() {
      if (!this.options.showSpinner) return;
      this.spinner = this.spinner || $('<div class="' + this.options.modalClass + '-spinner"></div>')
        .append(this.options.spinnerHtml);
      this.$body.append(this.spinner);
      this.spinner.show();
    },

    hideSpinner: function() {
      if (this.spinner) this.spinner.remove();
    },

    //Return context for custom events
    _ctx: function() {
      return { elm: this.$elm, $elm: this.$elm, $blocker: this.$blocker, options: this.options };
    }
  };

  $.modalj.close = function(event) {
    if (!$.modalj.isActive()) return;
    if (event) event.preventDefault();
    var current = getCurrent();
    current.close();
    return current.$elm;
  };

  // Returns if there currently is an active modal
  $.modalj.isActive = function () {
    return modals.length > 0;
  };

  $.modalj.getCurrent = getCurrent;

  $.modalj.defaults = {
    closeExisting: true,
    escapeClose: true,
    clickClose: true,
    closeText: 'Fechar',
    closeClass: '',
    modalClass: "jmodal",
    blockerClass: "jquery-jmodal",
    spinnerHtml: '<div class="rect1"></div><div class="rect2"></div><div class="rect3"></div><div class="rect4"></div>',
    showSpinner: true,
    showClose: true,
    fadeDuration: 250,   // Number of milliseconds the fade animation takes.
    fadeDelay: 1.0        // Point during the overlay's fade-in that the modal begins to fade in (.5 = 50%, 1.5 = 150%, etc.)
  };

  // Event constants
  $.modalj.BEFORE_BLOCK = 'jmodal:before-block';
  $.modalj.BLOCK = 'jmodal:block';
  $.modalj.BEFORE_OPEN = 'jmodal:before-open';
  $.modalj.OPEN = 'jmodal:open';
  $.modalj.BEFORE_CLOSE = 'jmodal:before-close';
  $.modalj.CLOSE = 'jmodal:close';
  $.modalj.AFTER_CLOSE = 'jmodal:after-close';
  $.modalj.AJAX_SEND = 'jmodal:ajax:send';
  $.modalj.AJAX_SUCCESS = 'jmodal:ajax:success';
  $.modalj.AJAX_FAIL = 'jmodal:ajax:fail';
  $.modalj.AJAX_COMPLETE = 'jmodal:ajax:complete';

  $.fn.modal = function(options){
    if (this.length === 1) {
      new $.modalj(this, options);
    }
    return this;
  };

  // Automatically bind links with rel="modal:close" to, well, close the modal.
  $(document).on('click.jmodal', 'a[rel~="jmodal:close"]', $.modalj.close);
  $(document).on('click.jmodal', 'a[rel~="jmodal:open"]', function(event) {
    event.preventDefault();
    $(this).modal();
  });
}));
