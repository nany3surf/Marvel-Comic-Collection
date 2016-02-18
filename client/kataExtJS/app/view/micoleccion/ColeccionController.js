/**
 * ViewController para la vista kataExtJS.view.micoleccion.Coleccion
 */
Ext.define('kataExtJS.view.micoleccion.ColeccionController', {
    extend  : 'Ext.app.ViewController',
    alias   : 'controller.coleccion',
    requires: ['kataExtJS.view.micoleccion.List','kataExtJS.model.MarvelComic','kataExtJS.view.marvelcomic.List'],

    /**
     * Ejecucion inicial, donde podemos inicializar datos o añadir listeners de
     * eventos de applicacion entre otros.
     */
    init: function () {
        var that = this, store;
        store = that.getStore('comics');
        // actualizamos dinamicamente el valor de comicsLength del viewmodel cada
        // vez que cambian los datos del store, para actualizar el contador de registros del
        // título del grid
        store.on('datachanged', function () {
            that.getViewModel().set('comicsLength', store.count());
        });
    },

    /**
     * Se ejecuta cuando hacemos click sobre el boton añadir de la lista de mi coleccion
     */
    onAddClicked: function () {
        var records = [];
        var colecStore = Ext.create('Ext.data.Store', {
            fields : ['id','idComic','title','description','pageCount','buyDate','salesDate','series','price','creators','characters'],
            data: records,
            paging : false,
            autoLoad: true,
            storeId: 'ColecStore'
        });

        /* Creamos una instancia del Store */
        Ext.create('Ext.window.Window', {
            autoShow: true,
            modal: true,
            width: 650,
            height: 400,
            id: 'myWindow',
            title: 'Añadir a mi colección',
            viewModel: {
                type: 'marvel'
            },
            items: [
                {
                    xtype: 'marvelcomiclist',
                    store: colecStore,
                    reference: 'marvelcomiclist',
                    region: 'center',
                    id: 'comicWindow',
                    width: 650,
                    height: 400,
                    listeners: {
                        'render': this.getComics,
                        'itemdblclick': this.onListClicked
                    }
                }
            ]
        });
    },

    /**
     * Se encarga de llamar al servicio MarvelComics para recuperar los comics que quedan sin comprar
     *
     */
    getComics: function() {
        var records = [];

        Ext.Ajax.request({ //dispara la petición
            url: '../services/MarvelComics', //la URL donde se realiza la petición
            method: 'GET', //El método HTTP usado para la petición
            params: {userId: 'userId'},//los parámetros que se usaran para la solicitud
            scope: this, //especifica el contexto de las funciones anteriores
            success: function (response) {
                var res = Ext.decode(response.responseText, true);
                if (res !== null && typeof (res) !== 'undefined') {
                    Ext.each(res, function (obj) {
                        records.push({
                            idComic: obj.id,
                            title: obj.title,
                            description: obj.description,
                            pageCount: obj.pageCount,
                            buyDate: obj.dates[1].date,
                            salesDate: obj.dates[0].date,
                            series: obj.series,
                            price: obj.prices[0].price,
                            creators: obj.creators,
                            characters: obj.characters
                        })
                    });
                    Ext.getStore('ColecStore').loadData(records);
                    Ext.getCmp('comicWindow').setTitle('Listado de comics por comprar ['+Ext.getStore('ColecStore').count()+']');
                }
            }
        });
    },

    /**
     * Se ejecuta cuando hacemos click sobre cualquiera de las celdas de la lista.
     * Se encarga de añadir un elemento a mi colección y eliminarlo de la ventana de comics a comprar
     */
    onListClicked: function (view, rec, node, index, e) {
        Ext.Ajax.request({ //dispara la petición
            url: '../services/collection', //la URL donde se realiza la petición
            method: 'POST', //El método HTTP usado para la petición
            jsonData: Ext.util.JSON.encode(rec.data),//los parámetros que se usaran para la solicitud
            scope: this, //especifica el contexto de las funciones anteriores
            success: function (response) {
                Ext.getStore('Comics').load();
                Ext.getStore('ColecStore').remove(rec);
                Ext.getCmp('comicWindow').setTitle('Listado de comics por comprar ['+Ext.getStore('ColecStore').count()+']');
            }
        });
    },

    /**
     * Se ejecuta cuando hacemos click sobre cualquiera de las celdas de la lista.
     *
     * @param {kataExtJS.view.micoleccion.List} list
     * @param {HTMLElement} td
     * @param {HTMLElement} cellIndex
     * @param {kataExtJS.model.ColeccionComic} coleccionComic
     */
    onCellClicked: function (list, td, cellIndex, coleccionComic) {
        // comprobamos qeu el click sea sobre la celda
        if (Ext.get(td).hasCls('delete-column')) {
            this.deleteColeccionComic(coleccionComic);
        }
    },

    /**
     * Elimina un comic de nuestra colección
     *
     * @param {kataExtJS.model.ColeccionComic} coleccionComic
     */
    deleteColeccionComic: function (coleccionComic) {
        var that = this, coleccionList, index, store;

        store = that.getStore('comics');
        index = store.indexOfId(coleccionComic.get('id'));

        // realizamos la peticion de borrado
        coleccionComic.erase({
            /**
             * Función de callback cuando se ha completado el proceso de borrado
             * @param {kataExtJS.model.ColeccionComic} cb cómic borrado
             * @param {Ext.data.operation.Operation} operation
             * @param {Boolean} success indica si la operacion se ha ejecutado correcta o incorrectamente
             */
            callback: function (cb, operation, success) {
                var selectable;
                if (success) {
                    // comprobamos si existe un registro antes o despues del borrado para seleccionarlo
                    coleccionList = that.getReferences().coleccionlist;
                    selectable = store.getAt(index) || store.getAt(index - 1);
                    if (selectable) {
                        // un objeto del tipo Ext.grid.Panel no tiene acceso directo a los registros seleccionados,
                        // si no que tiene que hacerlo a través de su modelo de selección (Ext.selection.Model)
                        coleccionList.getSelectionModel().select(selectable);
                    }
                }
            }
        });
    }
});
