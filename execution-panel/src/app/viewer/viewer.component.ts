import { Component, OnInit} from "@angular/core";
import { Http } from "@angular/http";
import * as Viewer from 'bpmn-js/lib/Viewer';

/////////////////// Start ///////////////////////
import { Observable } from 'rxjs/Observable';
import * as io from 'socket.io-client';
/////////////////// End /////////////////////////

declare function require(name:string);
const jQuery = require('jquery');
const input_params_as_form = require('ejs-compiled-loader!./input-params-as-form.ejs');
const href_list_as_dropdown_menu = require('ejs-compiled-loader!./href-list-as-dropdown-menu.ejs');

@Component({
    selector: 'viewer',
    template: '<input size="100" type="text" [(ngModel)]="url"><button (click)="loadModel()">Open</button><div id="canvas"></div>'
})
export class ViewerComponent implements OnInit {
    url = "http://localhost:3000";
    viewer: any;
    canvas: any;
    previousState: any = null;

///////////////////// Start //////////////////////////

    connection;
    message;

    private sURL = 'http://localhost:8090';
    private socket;

////////////////////// End /////////////////////////    

    constructor(private http: Http) {}
    loadModel() {
        console.log('about to load URL', this.url);
        this.http.get(this.url)
            .subscribe( resp => 
                this.viewer.importXML( resp.json().bpmn, (definitions) => {
                    this.renderState(resp.json());
                })
            );

////////////////////////// Start ///////////////////////////////////            
        this.socket.emit('add-message', this.message);
        console.log("MESSAGE SENT");
////////////////////////// End /////////////////////////////////////  

    }

    renderState(state:any) {
        if (this.previousState) {
            this.previousState.workItems.forEach( workItem => {
                this.canvas.removeMarker(workItem.elementId, 'highlight');
                this.canvas.removeMarker(workItem.elementId, 'highlight-running');
            });
            this.previousState.externalItemGroupList.forEach( workItem => {
                this.canvas.removeMarker(workItem.elementId, 'highlight-external');
            });
        }
        state.workItems.forEach( workItem => {
            if(workItem.status.indexOf('enabled') >= 0)
                this.canvas.addMarker(workItem.elementId, 'highlight')
            else
                this.canvas.addMarker(workItem.elementId, 'highlight-running')
        });
        state.externalItemGroupList.forEach( externalItemGroup => {
            if(externalItemGroup.status.indexOf('enabled') >= 0)
                this.canvas.addMarker(externalItemGroup.elementId, 'highlight-external')
        } );
        this.previousState = state;
    }

    setupListeners() {
        let eventBus = this.viewer.get('eventBus');
        let overlays = this.viewer.get('overlays');
        eventBus.on('element.click', (e:any) => {
            let nodeId = e.element.id;
            if (this.previousState) {
                this.previousState.workItems.forEach( workItem => {
                    if (workItem.elementId === nodeId && workItem.hrefs.length == 1) {
                        if(workItem.status[0] === 'enabled') {
                            this.canvas.removeMarker(workItem.elementId, 'highlight');
                            this.canvas.addMarker(workItem.elementId, 'highlight-running');                            
                            if (workItem.input.length == 0) {
                                this.http.post('http://localhost:3000' + workItem.hrefs[0], {elementId : workItem.elementId, inputParameters: []})
                                .subscribe( resp => this.http.get(this.url).subscribe( resp => this.renderState(resp.json()))); 
                            } else {
                                let overlayHtml = jQuery(input_params_as_form({nodeId: workItem.elementId, inputs: workItem.input}));
                                overlays.add(workItem.elementId, {position: {bottom: 0, right: 0}, html: overlayHtml});
                                overlayHtml
                                    .find(`#${workItem.elementId}_save`)
                                    .click((e:any) => {
                                        let nodeId =  e.target.id.slice(0, e.target.id.indexOf('_save'));
                                        overlays.remove({element: nodeId});

                                        let children = e.target.parentElement.querySelectorAll('.form-control');
                                        let values: Array<any> = [];
                                        workItem.input.forEach((input:any) => {
                                            children.forEach((child:any) => {
                                                if (child.id === input.name)
                                                    values.push(child.value);
                                            });
                                        });
                                      this.http.post('http://localhost:3000' + workItem.hrefs[0], {elementId : workItem.elementId, inputParameters: values})
                                        .subscribe( resp => this.http.get(this.url).subscribe( resp => this.renderState(resp.json())));
                                    });
                                overlayHtml.find(`#${workItem.elementId}_cancel`).click((e:any) => {
                                       overlays.remove({element: workItem.elementId});
                                });
                            }
                         }
                    } else if (workItem.elementId === nodeId && workItem.hrefs.length > 1) {
                        var toDisplay = [];
                        for (let i = 0; i < workItem.status.length; i++) {
                            if(workItem.status[i] === 'enabled')
                                toDisplay.push(workItem.hrefs[i]);
                        }
                        if(toDisplay.length > 0) {
                            let overlayHtml = jQuery(href_list_as_dropdown_menu({nodeId: nodeId, hrefList: toDisplay}));
                            overlays.add(nodeId, {position: {bottom: 0, right: 0}, html: overlayHtml});
                            overlayHtml.click((e:any) => {
 //                               console.log('selected', e.target);
                                let nodeId = e.target.id.split(';')[0];
                                let href = e.target.text;
                                overlays.remove({element: nodeId});
                                this.canvas.removeMarker(nodeId, 'highlight');
                                this.canvas.addMarker(nodeId, 'highlight-running');
                                this.http.post('http://localhost:3000' + href, {})
                                    .subscribe( resp => this.http.get(this.url).subscribe( resp => this.renderState(resp.json())));
                            });
                            overlayHtml.toggle();
                        }
                    }
                });
                this.previousState.externalItemGroupList.forEach( externalItemGroup => {
                    if (externalItemGroup.elementId === nodeId) {
                        var toDisplay = [];
                        for (let i = 0; i < externalItemGroup.status.length; i++) {
                            if(externalItemGroup.status[i] === 'enabled')
                                toDisplay.push(externalItemGroup.hrefs[i]);
                        }
                        if(toDisplay.length > 0) {
                            let overlayHtml = jQuery(href_list_as_dropdown_menu({nodeId: nodeId, hrefList: toDisplay}));
                            overlays.add(nodeId, {position: {bottom: 0, right: 0}, html: overlayHtml});
                            overlayHtml.toggle();
                        }
                    }
                });
            }
        });
    }

    ngOnInit(): void {
        this.viewer = new Viewer({ container: '#canvas' });
        this.canvas = this.viewer.get('canvas');
        this.setupListeners();

/////////////////////////// Start //////////////////////////////////////

    this.connection = this.getMessages().subscribe(message => {
        this.loadModel();
        console.log("Message from Server ...");
    })       

//////////////////////////// End //////////////////////////////////////

    }

////////////////////////// Start ///////////////////////////

    getMessages() {
        let observable = new Observable(observer => {
            this.socket = io(this.sURL);
            this.socket.on('message', (data) => {
            observer.next(data);
            });
            return () => {
                this.socket.disconnect();
            }
           })
      return observable;
    }


    ngOnDestroy() {
        this.connection.unsubscribe();
    }

/////////////////////// End //////////////////////////////

}