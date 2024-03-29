sap.ui.define([
	"./BaseController",
	"sap/ui/model/json/JSONModel",
	"../model/formatter",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	'sap/ui/export/library',
	'sap/ui/export/Spreadsheet',
	"sap/ui/core/BusyIndicator"
], function (BaseController, JSONModel, formatter, Filter, FilterOperator, exportLibrary, Spreadsheet) {
	"use strict";

	var EdmType = exportLibrary.EdmType;

	return BaseController.extend("com.tasa.pdeclaradacierredia.controller.Worklist", {

		formatter: formatter,

		/* =========================================================== */
		/* lifecycle methods                                           */
		/* =========================================================== */

		/**
		 * Called when the worklist controller is instantiated.
		 * @public
		 */
		onInit: function () {
			var oViewModel,
				iOriginalBusyDelay,
				oTable = this.byId("table");

			// Put down worklist table's original value for busy indicator delay,
			// so it can be restored later on. Busy handling on the table is
			// taken care of by the table itself.
			iOriginalBusyDelay = oTable.getBusyIndicatorDelay();
			// keeps the search state
			this._aTableSearchState = [];

			// Model used to manipulate control states
			oViewModel = new JSONModel({
				worklistTableTitle: this.getResourceBundle().getText("worklistTableTitle"),				tableNoDataText: this.getResourceBundle().getText("tableNoDataText"),
				tableBusyDelay: 0
			});
			this.setModel(oViewModel, "worklistView");

			// Make sure, busy indication is showing immediately so there is no
			// break after the busy indication for loading the view's meta data is
			// ended (see promise 'oWhenMetadataIsLoaded' in AppController)
			oTable.attachEventOnce("updateFinished", function () {
				// Restore original busy indicator delay for worklist's table
				oViewModel.setProperty("/tableBusyDelay", iOriginalBusyDelay);
			});

			this.loadData();
		},

		/* =========================================================== */
		/* event handlers                                              */
		/* =========================================================== */

		/**
		 * Triggered by the table's 'updateFinished' event: after new table
		 * data is available, this handler method updates the table counter.
		 * This should only happen if the update was successful, which is
		 * why this handler is attached to 'updateFinished' and not to the
		 * table's list binding's 'dataReceived' method.
		 * @param {sap.ui.base.Event} oEvent the update finished event
		 * @public
		 */
		onUpdateFinished: function (oEvent) {
			// update the worklist's object counter after the table update
			var sTitle,
				oTable = oEvent.getSource(),
				iTotalItems = oEvent.getParameter("total");
			// only update the counter if the length is final and
			// the table is not empty
			if (iTotalItems && oTable.getBinding("items").isLengthFinal()) {
				sTitle = this.getResourceBundle().getText("worklistTableTitleCount", [iTotalItems]);
			} else {
				sTitle = this.getResourceBundle().getText("worklistTableTitle");
			}
			this.getModel("worklistView").setProperty("/worklistTableTitle", sTitle);
		},

		/**
		 * Event handler when a table item gets pressed
		 * @param {sap.ui.base.Event} oEvent the table selectionChange event
		 * @public
		 */
		onPress: function (oEvent) {
			// The source is the list item that got pressed
			this._showObject(oEvent.getSource());
		},

		/**
		 * Event handler for navigating back.
		 * We navigate back in the browser history
		 * @public
		 */
		onNavBack: function () {
			// eslint-disable-next-line sap-no-history-manipulation
			history.go(-1);
		},


		onSearch: function (oEvent) {
			const oTableItemsBinding = this.byId("table").getBinding("items");
			var sQuery = oEvent.getSource().getValue();

			if (oEvent.getParameters().refreshButtonPressed) {
				// Search field's 'refresh' button has been pressed.
				// This is visible if you select any master list item.
				// In this case no new search is triggered, we only
				// refresh the list binding.
				this.onRefresh();
			} else {
				
				if (sQuery && sQuery.length > 0) {
					var aTableSearchState = [];

					aTableSearchState = [
						new Filter("WERKS", FilterOperator.Contains, sQuery),
						new Filter("DESCR", FilterOperator.Contains, sQuery),
						new Filter("CNPCM", FilterOperator.EQ, sQuery),
						new Filter("FCIER", FilterOperator.EQ, sQuery)
					];
				}else{
					this.onRefresh();
				}
				var oFilters = new Filter({
					filters: aTableSearchState,
					and:false
				});
				oTableItemsBinding.filter(oFilters,"Application");

			}

		},

		/**
		 * Event handler for refresh event. Keeps filter, sort
		 * and group settings and refreshes the list binding.
		 * @public
		 */
		onRefresh: function () {
			var oTable = this.byId("table");
			oTable.getBinding("items").refresh();
		},

		/* =========================================================== */
		/* internal methods                                            */
		/* =========================================================== */

		/**
		 * Shows the selected item on the object page
		 * On phones a additional history entry is created
		 * @param {sap.m.ObjectListItem} oItem selected Item
		 * @private
		 */
		_showObject: function (oItem) {
			this.getRouter().navTo("object", {
				objectId: oItem.getBindingContext().getProperty("ProductID")
			});
		},

		/**
		 * Internal helper method to apply both filter and search state together on the list binding
		 * @param {sap.ui.model.Filter[]} aTableSearchState An array of filters for the search
		 * @private
		 */
		_applySearch: function (aTableSearchState) {
			var oTable = this.byId("table"),
				oViewModel = this.getModel("worklistView");
			oTable.getBinding("items").filter(aTableSearchState, "Application");
			// changes the noDataText of the list in case there are no filter results
			/* if (aTableSearchState.length !== 0) {
				oViewModel.setProperty("/tableNoDataText", this.getResourceBundle().getText("worklistNoDataWithSearchText"));
			} */
		},
		loadData: function () {
			let now = new Date();

			this.byId("dateRange").setDateValue(now);
			this.byId("dateRange").setSecondDateValue(now);
		},
		getListPescaDeclaradaCierreDia: async function () {
			let oModel = this.getModel(),
			sRangeDate = oModel.getProperty("/rangeDate");
			if(!sRangeDate){
				this.getMessageDialog("Warning","Ingrese fecha");
				return;
			}
			let sStartDate = sRangeDate.split("-")[0].trim(),
			sEndDate = sRangeDate.split("-")[1].trim(),
			oParam = new Object;

			sStartDate = formatter.formatDateInverse(sStartDate);
			sEndDate = formatter.formatDateInverse(sEndDate);
			oParam.sStartDate = sStartDate;
			oParam.sEndDate = sEndDate;

			this.getDataMainTable(oModel, oParam);
			// let fechaInicio = this.byId("dateRange").getDateValue();
			// let fechaFin = this.byId("dateRange").getSecondDateValue();

			// let data = await this.getPescaDeclaradaCierreDia(fechaInicio, fechaFin);

			// let listPescaDeclaradaCierreDia = data.data;
			// //Establecer la cadena de fecha como objeto Date
			// listPescaDeclaradaCierreDia.forEach(p => {
			// 	p.FCIER = this.formatter.getDateFromString(p.FCIER);
			// });
			// this.getModel().setProperty("/listPescaDeclaradaCierreDia", listPescaDeclaradaCierreDia);
		},
		createColumnConfig: function () {
			var aCols = [];

			aCols.push({
				label: 'Centro',
				type: EdmType.String,
				property: 'WERKS'
			});

			aCols.push({
				label: 'Descripción',
				type: EdmType.String,
				property: 'DESCR'
			});

			aCols.push({
				label: 'Pesca Declarada',
				type: EdmType.Number,
				property: 'CNPCM',
				scale: 0
			});

			aCols.push({
				label: 'Fecha',
				type: EdmType.DateTime,
				property: 'FCIER',
				format: 'yyyy-mm-dd'
			});

			return aCols;
		},
		onExport: function () {
			let oTable = this.getView().byId("table"),
			oRowBinding = oTable.getBinding('items'),
			aCols,oSettings, oSheet;
			if(oRowBinding.oList.length===0){
                this.getMessageDialog("Warning","No hay datos para exportar");
                return;
			}
			aCols = this.createColumnConfig();

			oSettings = {
				workbook: {
					columns: aCols,
					hierarchyLevel: 'Level'
				},
				dataSource: oRowBinding,
				fileName: 'PescDeclCierre.xlsx',
				worker: false // We need to disable worker because we are using a MockServer as OData Service
			};

			oSheet = new Spreadsheet(oSettings);
			oSheet.build().finally(function () {
				oSheet.destroy();
			});
		}
	});
});