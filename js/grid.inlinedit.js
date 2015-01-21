/*jshint eqeqeq:false, eqnull:true, devel:true */
/*jslint browser: true, devel: true, eqeq: true, evil: true, nomen: true, plusplus: true, regexp: true, unparam: true, todo: true, vars: true, white: true, maxerr: 999 */
/*global jQuery */
(function($){
/**
 * jqGrid extension for manipulating Grid Data
 * Tony Tomov tony@trirand.com
 * http://trirand.com/blog/ 
 * Dual licensed under the MIT and GPL licenses:
 * http://www.opensource.org/licenses/mit-license.php
 * http://www.gnu.org/licenses/gpl-2.0.html
**/ 
"use strict";
var jgrid = $.jgrid;
jgrid.inlineEdit = jgrid.inlineEdit || {};
jgrid.extend({
//Editing
	editRow : function(rowid,keys,oneditfunc,successfunc, url, extraparam, aftersavefunc,errorfunc, afterrestorefunc) {
		// Compatible mode old versions
		var o={}, args = $.makeArray(arguments).slice(1);

		if( $.type(args[0]) === "object" ) {
			o = args[0];
		} else {
			if (keys !== undefined) { o.keys = keys; }
			if ($.isFunction(oneditfunc)) { o.oneditfunc = oneditfunc; }
			if ($.isFunction(successfunc)) { o.successfunc = successfunc; }
			if (url !== undefined) { o.url = url; }
			if (extraparam !== undefined) { o.extraparam = extraparam; }
			if ($.isFunction(aftersavefunc)) { o.aftersavefunc = aftersavefunc; }
			if ($.isFunction(errorfunc)) { o.errorfunc = errorfunc; }
			if ($.isFunction(afterrestorefunc)) { o.afterrestorefunc = afterrestorefunc; }
			// last two not as param, but as object (sorry)
			//if (restoreAfterError !== undefined) { o.restoreAfterError = restoreAfterError; }
			//if (mtype !== undefined) { o.mtype = mtype || "POST"; }			
		}
		o = $.extend(true, {
			keys : false,
			oneditfunc: null,
			successfunc: null,
			url: null,
			extraparam: {},
			aftersavefunc: null,
			errorfunc: null,
			afterrestorefunc: null,
			restoreAfterError: true,
			mtype: "POST",
			focusField : true
		}, jgrid.inlineEdit, o );

		// End compatible
		return this.each(function(){
			var $t = this, $self = $($t), p = $t.p, nm, tmp, cnt=0, focus=null, svr={},cm, bfer;
			if (!$t.grid ) { return; }
			var ind = $self.jqGrid("getInd",rowid,true);
			if( ind === false ) {return;}
			bfer = $.isFunction( o.beforeEditRow ) ? o.beforeEditRow.call($t,o, rowid) :  undefined;
			if( bfer === undefined ) {
				bfer = true;
			}
			if(!bfer) { return; }
			var editable = $(ind).attr("editable") || "0";
			if (editable === "0" && !$(ind).hasClass("not-editable-row")) {
				cm = p.colModel;
				$('td[role="gridcell"]',ind).each( function(i) {
					nm = cm[i].name;
					var treeg = p.treeGrid===true && nm === p.ExpandColumn;
					if(treeg) { tmp = $("span:first",this).html();}
					else {
						try {
							tmp = $.unformat.call($t,this,{rowId:rowid, colModel:cm[i]},i);
						} catch (_) {
							tmp =  ( cm[i].edittype && cm[i].edittype === 'textarea' ) ? $(this).text() : $(this).html();
						}
					}
					if ( nm !== 'cb' && nm !== 'subgrid' && nm !== 'rn') {
						if(p.autoencode) { tmp = jgrid.htmlDecode(tmp); }
						svr[nm]=tmp;
						if(cm[i].editable===true) {
							if(focus===null) { focus = i; }
							if (treeg) { $("span:first",this).html(""); }
							else { $(this).html(""); }
							var opt = $.extend({},cm[i].editoptions || {},{id:rowid+"_"+nm,name:nm,rowId:rowid});
							if(!cm[i].edittype) { cm[i].edittype = "text"; }
							if(tmp === "&nbsp;" || tmp === "&#160;" || (tmp.length===1 && tmp.charCodeAt(0)===160) ) {tmp='';}
							var elc = jgrid.createEl.call($t,cm[i].edittype,opt,tmp,true,$.extend({},jgrid.ajaxOptions,p.ajaxSelectOptions || {}));
							$(elc).addClass("editable");
							if(treeg) { $("span:first",this).append(elc); }
							else { $(this).append(elc); }
							jgrid.bindEv.call($t, elc, opt);
							//Again IE
							if(cm[i].edittype === "select" && cm[i].editoptions!==undefined && cm[i].editoptions.multiple===true  && cm[i].editoptions.dataUrl===undefined && jgrid.msie) {
								$(elc).width($(elc).width());
							}
							cnt++;
						}
					}
				});
				if(cnt > 0) {
					svr.id = rowid; p.savedRow.push(svr);
					$(ind).attr("editable","1");
					if(o.focusField ) {
						if(typeof o.focusField === 'number' && parseInt(o.focusField,10) <= cm.length) {
							focus = o.focusField;
						}
						setTimeout(function(){ 
							var fe = $("td:eq("+focus+") :input:visible",ind).not(":disabled"); 
							if(fe.length > 0) {
								fe.focus();
							}
						},0);
					}
					if(o.keys===true) {
						$(ind).bind("keydown",function(e) {
							if (e.keyCode === 27) {
								$self.jqGrid("restoreRow",rowid, o.afterrestorefunc);
								if(p._inlinenav) {
									try {
										$self.jqGrid('showAddEditButtons');
									} catch (ignore) {}
								}
								return false;
							}
							if (e.keyCode === 13) {
								var ta = e.target;
								if(ta.tagName === 'TEXTAREA') { return true; }
								if( $self.jqGrid("saveRow", rowid, o ) ) {
									if(p._inlinenav) {
										try {
											$self.jqGrid('showAddEditButtons');
										} catch (ignore) {}
									}
								}
								return false;
							}
						});
					}
					$self.triggerHandler("jqGridInlineEditRow", [rowid, o]);
					if( $.isFunction(o.oneditfunc)) { o.oneditfunc.call($t, rowid); }
				}
			}
		});
	},
	saveRow : function(rowid, successfunc, url, extraparam, aftersavefunc,errorfunc, afterrestorefunc) {
		// Compatible mode old versions
		var args = $.makeArray(arguments).slice(1), o = {};

		if( $.type(args[0]) === "object" ) {
			o = args[0];
		} else {
			if ($.isFunction(successfunc)) { o.successfunc = successfunc; }
			if (url !== undefined) { o.url = url; }
			if (extraparam !== undefined) { o.extraparam = extraparam; }
			if ($.isFunction(aftersavefunc)) { o.aftersavefunc = aftersavefunc; }
			if ($.isFunction(errorfunc)) { o.errorfunc = errorfunc; }
			if ($.isFunction(afterrestorefunc)) { o.afterrestorefunc = afterrestorefunc; }
		}
		o = $.extend(true, {
			successfunc: null,
			url: null,
			extraparam: {},
			aftersavefunc: null,
			errorfunc: null,
			afterrestorefunc: null,
			restoreAfterError: true,
			mtype: "POST",
			saveui : "enable",
			savetext : jgrid.defaults.savetext || "Saving..."
		}, jgrid.inlineEdit, o );
		// End compatible
		// TODO: add return this.each(function(){....}
		var success = false;
		var $self = this, $t = $self[0], p = $t.p, nm, tmp={}, tmp2={}, tmp3= {}, editable, fr, cv, ind;
		if (!$t.grid ) { return success; }
		ind = $self.jqGrid("getInd",rowid,true);
		if(ind === false) {return success;}
		var bfsr = $.isFunction( o.beforeSaveRow ) ?	o.beforeSaveRow.call($t,o, rowid) :  undefined;
		if( bfsr === undefined ) {
			bfsr = true;
		}
		if (!bfsr) { return success; }
		editable = $(ind).attr("editable");
		o.url = o.url || p.editurl;
		if (editable==="1") {
			var cm;
			$('td[role="gridcell"]',ind).each(function(i) {
				cm = p.colModel[i];
				nm = cm.name;
				if ( nm !== 'cb' && nm !== 'subgrid' && cm.editable===true && nm !== 'rn' && !$(this).hasClass('not-editable-cell')) {
					switch (cm.edittype) {
						case "checkbox":
							var cbv = ["Yes","No"];
							if(cm.editoptions ) {
								cbv = cm.editoptions.value.split(":");
							}
							tmp[nm]=  $("input",this).is(":checked") ? cbv[0] : cbv[1]; 
							break;
						case 'text':
						case 'password':
						case 'textarea':
						case "button" :
							tmp[nm]=$("input, textarea",this).val();
							break;
						case 'select':
							if(!cm.editoptions.multiple) {
								tmp[nm] = $("select option:selected",this).val();
								tmp2[nm] = $("select option:selected", this).text();
							} else {
								var sel = $("select",this), selectedText = [];
								tmp[nm] = $(sel).val();
								if(tmp[nm]) { tmp[nm]= tmp[nm].join(","); } else { tmp[nm] =""; }
								$("select option:selected",this).each(
									function(i,selected){
										selectedText[i] = $(selected).text();
									}
								);
								tmp2[nm] = selectedText.join(",");
							}
							if(cm.formatter && cm.formatter === 'select') { tmp2={}; }
							break;
						case 'custom' :
							try {
								if(cm.editoptions && $.isFunction(cm.editoptions.custom_value)) {
									tmp[nm] = cm.editoptions.custom_value.call($t, $(".customelement",this),'get');
									if (tmp[nm] === undefined) { throw "e2"; }
								} else { throw "e1"; }
							} catch (e) {
								if (e==="e1") { jgrid.info_dialog(jgrid.errors.errcap,"function 'custom_value' "+jgrid.edit.msg.nodefined,jgrid.edit.bClose); }
								if (e==="e2") { jgrid.info_dialog(jgrid.errors.errcap,"function 'custom_value' "+jgrid.edit.msg.novalue,jgrid.edit.bClose); }
								else { jgrid.info_dialog(jgrid.errors.errcap,e.message,jgrid.edit.bClose); }
							}
							break;
					}
					cv = jgrid.checkValues.call($t,tmp[nm],i);
					if(cv[0] === false) {
						return false;
					}
					if(p.autoencode) { tmp[nm] = jgrid.htmlEncode(tmp[nm]); }
					if(o.url !== 'clientArray' && cm.editoptions && cm.editoptions.NullIfEmpty === true) {
						if(tmp[nm] === "") {
							tmp3[nm] = 'null';
						}
					}
				}
			});
			if (cv[0] === false){
				try {
					var tr = $self.jqGrid('getGridRowById', rowid), positions = jgrid.findPos(tr);
					jgrid.info_dialog(jgrid.errors.errcap,cv[1],jgrid.edit.bClose,{left:positions[0],top:positions[1]+$(tr).outerHeight()});
				} catch (e) {
					alert(cv[1]);
				}
				return success;
			}
			var idname, opers = p.prmNames, oldRowId = rowid;
			if (p.keyName === false) {
				idname = opers.id;
			} else {
				idname = p.keyName;
			}
			if(tmp) {
				tmp[opers.oper] = opers.editoper;
				if (tmp[idname] === undefined || tmp[idname]==="") {
					tmp[idname] = rowid;
				} else if (ind.id !== p.idPrefix + tmp[idname]) {
					// rename rowid
					var oldid = jgrid.stripPref(p.idPrefix, rowid);
					if (p._index[oldid] !== undefined) {
						p._index[tmp[idname]] = p._index[oldid];
						delete p._index[oldid];
					}
					rowid = p.idPrefix + tmp[idname];
					$(ind).attr("id", rowid);
					if (p.selrow === oldRowId) {
						p.selrow = rowid;
					}
					if ($.isArray(p.selarrrow)) {
						var i = $.inArray(oldRowId, p.selarrrow);
						if (i>=0) {
							p.selarrrow[i] = rowid;
						}
					}
					if (p.multiselect) {
						var newCboxId = "jqg_" + p.id + "_" + rowid;
						$("input.cbox",ind)
							.attr("id", newCboxId)
							.attr("name", newCboxId);
					}
					// TODO: to test the case of frozen columns
				}
				if(p.inlineData === undefined) { p.inlineData ={}; }
				tmp = $.extend({},tmp,p.inlineData,o.extraparam);
			}
			if (o.url === 'clientArray') {
				tmp = $.extend({},tmp, tmp2);
				if(p.autoencode) {
					$.each(tmp,function(n,v){
						tmp[n] = jgrid.htmlDecode(v);
					});
				}
				var k, resp = $self.jqGrid("setRowData",rowid,tmp);
				$(ind).attr("editable","0");
				for(k=0;k<p.savedRow.length;k++) {
					if( String(p.savedRow[k].id) === String(oldRowId)) {fr = k; break;}
				}
				if(fr >= 0) { p.savedRow.splice(fr,1); }
				$self.triggerHandler("jqGridInlineAfterSaveRow", [rowid, resp, tmp, o]);
				if( $.isFunction(o.aftersavefunc) ) { o.aftersavefunc.call($t, rowid, resp, tmp, o); }
				success = true;
				$(ind).removeClass("jqgrid-new-row").unbind("keydown");
			} else {
				$self.jqGrid("progressBar", {method:"show", loadtype : o.saveui, htmlcontent: o.savetext });
				tmp3 = $.extend({},tmp,tmp3);
				tmp3[idname] = jgrid.stripPref(p.idPrefix, tmp3[idname]);
				$.ajax($.extend({
					url:o.url,
					data: $.isFunction(p.serializeRowData) ? p.serializeRowData.call($t, tmp3) : tmp3,
					type: o.mtype,
					async : false, //?!?
					complete: function(res,stat){
						$self.jqGrid("progressBar", {method:"hide", loadtype : o.saveui, htmlcontent: o.savetext});
						if (stat === "success"){
							var ret, sucret, j;
							sucret = $self.triggerHandler("jqGridInlineSuccessSaveRow", [res, rowid, o]);
							if (!$.isArray(sucret)) {sucret = [true, tmp];}
							if (sucret[0] && $.isFunction(o.successfunc)) {sucret = o.successfunc.call($t, res);}							
							if($.isArray(sucret)) {
								// expect array - status, data, rowid
								ret = sucret[0];
								tmp = sucret[1] || tmp;
							} else {
								ret = sucret;
							}
							if (ret===true) {
								if(p.autoencode) {
									$.each(tmp,function(n,v){
										tmp[n] = jgrid.htmlDecode(v);
									});
								}
								tmp = $.extend({},tmp, tmp2);
								$self.jqGrid("setRowData",rowid,tmp);
								$(ind).attr("editable","0");
								for(j=0;j<p.savedRow.length;j++) {
									if( String(p.savedRow[j].id) === String(rowid)) {fr = j; break;}
								}
								if(fr >= 0) { p.savedRow.splice(fr,1); }
								$self.triggerHandler("jqGridInlineAfterSaveRow", [rowid, res, tmp, o]);
								if( $.isFunction(o.aftersavefunc) ) { o.aftersavefunc.call($t, rowid, res, tmp, o); }
								success = true;
								$(ind).removeClass("jqgrid-new-row").unbind("keydown");
							} else {
								$self.triggerHandler("jqGridInlineErrorSaveRow", [rowid, res, stat, null, o]);
								if($.isFunction(o.errorfunc) ) {
									o.errorfunc.call($t, rowid, res, stat, null);
								}
								if(o.restoreAfterError === true) {
									$self.jqGrid("restoreRow",rowid, o.afterrestorefunc);
								}
							}
						}
					},
					error:function(res,stat,err){
						$("#lui_"+jgrid.jqID(p.id)).hide();
						$self.triggerHandler("jqGridInlineErrorSaveRow", [rowid, res, stat, err, o]);
						if($.isFunction(o.errorfunc) ) {
							o.errorfunc.call($t, rowid, res, stat, err);
						} else {
							var rT = res.responseText || res.statusText;
							try {
								jgrid.info_dialog(jgrid.errors.errcap,'<div class="ui-state-error">'+ rT +'</div>', jgrid.edit.bClose,{buttonalign:'right'});
							} catch(e) {
								alert(rT);
							}
						}
						if(o.restoreAfterError === true) {
							$self.jqGrid("restoreRow",rowid, o.afterrestorefunc);
						}
					}
				}, jgrid.ajaxOptions, p.ajaxRowOptions || {}));
			}
		}
		return success;
	},
	restoreRow : function(rowid, afterrestorefunc) {
		// Compatible mode old versions
		var args = $.makeArray(arguments).slice(1), o={};

		if( $.type(args[0]) === "object" ) {
			o = args[0];
		} else {
			if ($.isFunction(afterrestorefunc)) { o.afterrestorefunc = afterrestorefunc; }
		}
		o = $.extend(true, {}, jgrid.inlineEdit, o );

		// End compatible

		return this.each(function(){
			var $t = this, $self = $($t), p = $t.p, fr=-1, ares={}, k;
			if (!$t.grid ) { return; }
			var ind = $self.jqGrid("getInd",rowid,true);
			if(ind === false) {return;}
			var bfcr = $.isFunction( o.beforeCancelRow ) ?	o.beforeCancelRow.call($t, o, rowid) :  undefined;
			if( bfcr === undefined ) {
				bfcr = true;
			}
			if(!bfcr) { return; }
			for(k=0;k<p.savedRow.length;k++) {
				if( String(p.savedRow[k].id) === String(rowid)) {fr = k; break;}
			}
			if(fr >= 0) {
				if($.isFunction($.fn.datepicker)) {
					try {
						$("input.hasDatepicker","#"+jgrid.jqID(ind.id)).datepicker('hide');
					} catch (ignore) {}
				}
				$.each(p.colModel, function(){
					if(this.editable === true && p.savedRow[fr].hasOwnProperty(this.name)) {
						ares[this.name] = p.savedRow[fr][this.name];
					}
				});
				$self.jqGrid("setRowData",rowid,ares);
				$(ind).attr("editable","0").unbind("keydown");
				p.savedRow.splice(fr,1);
				if($("#"+jgrid.jqID(rowid), $t).hasClass("jqgrid-new-row")){
					setTimeout(function(){
						$self.jqGrid("delRowData",rowid);
						$self.jqGrid('showAddEditButtons');
					},0);
				}
			}
			$self.triggerHandler("jqGridInlineAfterRestoreRow", [rowid]);
			if ($.isFunction(o.afterrestorefunc))
			{
				o.afterrestorefunc.call($t, rowid);
			}
		});
	},
	addRow : function ( o ) {
		o = $.extend(true, {
			rowID : null,
			initdata : {},
			position :"first",
			useDefValues : true,
			useFormatter : false,
			addRowParams : {extraparam:{}}
		},o  || {});
		return this.each(function(){
			if (!this.grid ) { return; }
			var $t = this, $self = $($t), p = $t.p,
			bfar = $.isFunction( o.beforeAddRow ) ?	o.beforeAddRow.call($t,o.addRowParams) :  undefined;
			if( bfar === undefined ) {
				bfar = true;
			}
			if(!bfar) { return; }
			o.rowID = $.isFunction(o.rowID) ? o.rowID.call($t, o) : ( (o.rowID != null) ? o.rowID : jgrid.randId());
			if(o.useDefValues === true) {
				$(p.colModel).each(function(){
					if( this.editoptions && this.editoptions.defaultValue ) {
						var opt = this.editoptions.defaultValue,
						tmp = $.isFunction(opt) ? opt.call($t) : opt;
						o.initdata[this.name] = tmp;
					}
				});
			}
			$self.jqGrid('addRowData', o.rowID, o.initdata, o.position);
			o.rowID = p.idPrefix + o.rowID;
			$("#"+jgrid.jqID(o.rowID), $t).addClass("jqgrid-new-row");
			if(o.useFormatter) {
				$("#"+jgrid.jqID(o.rowID)+" .ui-inline-edit", $t).click();
			} else {
				var opers = p.prmNames,
				oper = opers.oper;
				o.addRowParams.extraparam[oper] = opers.addoper;
				$self.jqGrid('editRow', o.rowID, o.addRowParams);
				$self.jqGrid('setSelection', o.rowID);
			}
		});
	},
	inlineNav : function (elem, o) {
		if (typeof elem === "object") {
			// the option pager are skipped
			o = elem;
			elem = undefined;
		}
		o = $.extend(true,{
			edit: true,
			editicon: "ui-icon-pencil",
			add: true,
			addicon:"ui-icon-plus",
			save: true,
			saveicon:"ui-icon-disk",
			cancel: true,
			cancelicon:"ui-icon-cancel",
			addParams : {addRowParams: {extraparam: {}}},
			editParams : {},
			restoreAfterSelect : true
		}, jgrid.nav, o ||{});
		return this.each(function(){
			if (!this.grid ) { return; }
			var $t = this, $self = $($t), onSelect, p = $t.p, gID = p.idSel, $elem;

			if (elem === undefined) {
				if (p.pager) {
					$self.jqGrid("inlineNav", p.pager, o)
					if ($t.p.toppager) {
						elem = $t.p.toppager;
					} else {
						return;
					}
				} else if ($t.p.toppager) {
					elem = $t.p.toppager;
				}
			}
			if (elem === undefined) {
				return; // error
			}
			$elem = $(elem);
			if ($elem.length <= 0) {
				return; // error
			}
			if ($elem.find(".navtable").length <= 0) {
				// create navigator bar if it is not yet exist
				$self.jqGrid("navGrid", elem, {add: false, edit: false, del: false, search: false, refresh: false, view: false});
			}

			p._inlinenav = true;
			// detect the formatactions column
			if(o.addParams.useFormatter === true) {
				var cm = p.colModel,i, defaults, ap;
				for (i = 0; i<cm.length; i++) {
					if(cm[i].formatter && cm[i].formatter === "actions" ) {
						if(cm[i].formatoptions) {
							defaults =  {
								keys:false,
								onEdit : null,
								onSuccess: null,
								afterSave:null,
								onError: null,
								afterRestore: null,
								extraparam: {},
								url: null
							};
							ap = $.extend( defaults, cm[i].formatoptions );
							o.addParams.addRowParams = {
								"keys" : ap.keys,
								"oneditfunc" : ap.onEdit,
								"successfunc" : ap.onSuccess,
								"url" : ap.url,
								"extraparam" : ap.extraparam,
								"aftersavefunc" : ap.afterSave,
								"errorfunc": ap.onError,
								"afterrestorefunc" : ap.afterRestore
							};
						}
						break;
					}
				}
			}
			if(o.add) {
				$self.jqGrid('navButtonAdd', elem,{
					caption : o.addtext,
					title : o.addtitle,
					buttonicon : o.addicon,
					id : p.id+"_iladd",
					onClickButton : function () {
						$self.jqGrid('addRow', o.addParams);
						if(!o.addParams.useFormatter) {
							$(gID+"_ilsave").removeClass('ui-state-disabled');
							$(gID+"_ilcancel").removeClass('ui-state-disabled');
							$(gID+"_iladd").addClass('ui-state-disabled');
							$(gID+"_iledit").addClass('ui-state-disabled');
						}
					}
				});
			}
			if(o.edit) {
				$self.jqGrid('navButtonAdd', elem,{
					caption : o.edittext,
					title : o.edittitle,
					buttonicon : o.editicon,
					id : p.id+"_iledit",
					onClickButton : function () {
						var sr = $self.jqGrid('getGridParam','selrow');
						if(sr) {
							$self.jqGrid('editRow', sr, o.editParams);
							$(gID+"_ilsave").removeClass('ui-state-disabled');
							$(gID+"_ilcancel").removeClass('ui-state-disabled');
							$(gID+"_iladd").addClass('ui-state-disabled');
							$(gID+"_iledit").addClass('ui-state-disabled');
						} else {
							jgrid.viewModal("#alertmod",{gbox:p.gBox,jqm:true});$("#jqg_alrt").focus();							
						}
					}
				});
			}
			if(o.save) {
				$self.jqGrid('navButtonAdd', elem,{
					caption : o.savetext || '',
					title : o.savetitle || 'Save row',
					buttonicon : o.saveicon,
					id : p.id+"_ilsave",
					onClickButton : function () {
						var sr = p.savedRow[0].id;
						if(sr) {
							var opers = p.prmNames,
							oper = opers.oper, tmpParams = o.editParams;
							if($("#"+jgrid.jqID(sr), $t ).hasClass("jqgrid-new-row")) {
								o.addParams.addRowParams.extraparam[oper] = opers.addoper;
								tmpParams = o.addParams.addRowParams;
							} else {
								if(!o.editParams.extraparam) {
									o.editParams.extraparam = {};
								}
								o.editParams.extraparam[oper] = opers.editoper;
							}
							if( $self.jqGrid('saveRow', sr, tmpParams) ) {
								$self.jqGrid('showAddEditButtons');
							}
						} else {
							jgrid.viewModal("#alertmod",{gbox:p.gBox,jqm:true});$("#jqg_alrt").focus();							
						}
					}
				});
				$(gID+"_ilsave").addClass('ui-state-disabled');
			}
			if(o.cancel) {
				$self.jqGrid('navButtonAdd', elem,{
					caption : o.canceltext || '',
					title : o.canceltitle || 'Cancel row editing',
					buttonicon : o.cancelicon,
					id : p.id+"_ilcancel",
					onClickButton : function () {
						var sr = p.savedRow[0].id, cancelPrm = o.editParams;
						if(sr) {
							if($("#"+jgrid.jqID(sr), $t ).hasClass("jqgrid-new-row")) {
								cancelPrm = o.addParams.addRowParams;
							}
							$self.jqGrid('restoreRow', sr, cancelPrm);
							$self.jqGrid('showAddEditButtons');
						} else {
							jgrid.viewModal("#alertmod",{gbox:p.gBox,jqm:true});$("#jqg_alrt").focus();							
						}
					}
				});
				$(gID+"_ilcancel").addClass('ui-state-disabled');
			}
			if(o.restoreAfterSelect === true) {
				if($.isFunction(p.beforeSelectRow)) {
					onSelect = p.beforeSelectRow;
				} else {
					onSelect =  false;
				}
				p.beforeSelectRow = function(id, stat) {
					var ret = true;
					if(p.savedRow.length > 0 && p._inlinenav===true && ( id !== p.selrow && p.selrow !==null) ) {
						if(p.selrow === o.addParams.rowID ) {
							$self.jqGrid('delRowData', p.selrow);
						} else {
							$self.jqGrid('restoreRow', p.selrow, o.editParams);
						}
						$self.jqGrid('showAddEditButtons');
					}
					if(onSelect) {
						ret = onSelect.call($t, id, stat);
					}
					return ret;
				};
			}

		});
	},
	showAddEditButtons : function()  {
		return this.each(function(){
			var $t = this;
			if (!$t.grid ) { return; }
			var gID = $t.p.idSel;
			$(gID+"_ilsave").addClass('ui-state-disabled');
			$(gID+"_ilcancel").addClass('ui-state-disabled');
			$(gID+"_iladd").removeClass('ui-state-disabled');
			$(gID+"_iledit").removeClass('ui-state-disabled');
		});
	}
//end inline edit
});
}(jQuery));
