import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Http } from '@angular/http';
import * as Viewer from 'bpmn-js/lib/Viewer';

/////////////////// Start ///////////////////////
import { Observable } from 'rxjs/Observable';
import { element } from 'protractor';
import { ProcessStorage } from '../data-store/data-store';
/////////////////// End /////////////////////////

declare function require(name: string);
const jQuery = require('jquery');
const input_params_as_form = require('ejs-compiled-loader!./input-params-as-form.ejs');
const href_list_as_dropdown_menu = require('ejs-compiled-loader!./href-list-as-dropdown-menu.ejs');

@Component({
  selector: 'viewer',
  styleUrls: ['./viewer.component.css'],
  templateUrl: "./viewer.component.html"
})
export class ViewerComponent implements OnInit {
  activeContracts = ['No Contracts Available'];
  url = 'No Contracts Available';
  viewer: any;
  canvas: any;
  previousState: any = null;

  ///////////////////// Start //////////////////////////

  connection;
  message;

  //private sURL = 'http://localhost:8090';
  //private socket;

  ////////////////////// End /////////////////////////

  constructor(private router: Router, private http: Http, private processStorage: ProcessStorage) {
     const instances = processStorage.getInstance(processStorage.modelId);
     this.activeContracts = [];
     instances.forEach(element => {
       this.activeContracts.push('http://localhost:3000/processes/' + element);
     });
     if (this.activeContracts.length === 0) {
       this.activeContracts.push('No Contracts Available');
       this.url = 'No Contracts Available';
     } else {
       this.url = 'http://localhost:3000/processes/' + processStorage.actInst;
     }
  }

  loadModel() {
    if (this.url !== 'No Contracts Available' && this.url !== '') {
      this.http.get(this.url)
        .subscribe(resp =>
          this.viewer.importXML(resp.json().bpmn, (definitions) => {
            this.renderState(resp.json());
          })
        );
    }
  }

  goToDashborad() {
      this.router.navigateByUrl('/dashboard');
  }

  updateContracts() {
    this.processStorage.updateInstances(this.processStorage.modelId);
    const res = this.processStorage.getInstance(this.processStorage.modelId);
    this.activeContracts = ['No Contracts Available'];
    res.forEach(element => {
        this.url = 'http://localhost:3000/processes/' + element;
        this.activeContracts.push(this.url);
    });
    if (this.activeContracts.length > 1 && this.activeContracts[0] === 'No Contracts Available') {
      this.activeContracts.splice(0, 1);
    }
  }

  renderState(state: any) {
    if (this.previousState) {
      this.previousState.workitems.forEach(workItem => {
        try {
          this.canvas.removeMarker(workItem.elementId, 'highlight');
          this.canvas.removeMarker(workItem.elementId, 'highlight-running');
        } catch(Error) {}
      });
    }
    this.previousState = [];
    state.workitems.forEach(workItem => {
      try { this.canvas.addMarker(workItem.elementId, 'highlight'); }
      catch(Error) {}
    });
    this.previousState = state;
  }

  setupListeners() {
    const eventBus = this.viewer.get('eventBus');
    const overlays = this.viewer.get('overlays');
    eventBus.on('element.click', (e: any) => {
      let nodeId = e.element.id;
      let workItem = undefined;
      if (this.previousState) {
        this.previousState.workitems.forEach(workItem1 => {
          if (workItem1.elementId === e.element.id) {
            workItem = workItem1;
            nodeId = e.element.id;
          }
        });
      }
      if (workItem) {
        if (workItem.hrefs.length === 1) {
            this.canvas.removeMarker(workItem.elementId, 'highlight');
            this.canvas.addMarker(workItem.elementId, 'highlight-running');
            if (workItem.input.length === 0) {
              this.http.post('http://localhost:3000' + workItem.hrefs[0], { elementId: workItem.elementId, inputParameters: [] })
                .subscribe(resp => this.http.get(this.url).subscribe(resp => this.renderState(resp.json())));
            } else {
              const overlayHtml = jQuery(input_params_as_form({ nodeId: workItem.elementId, inputs: workItem.input }));
              overlays.add(workItem.elementId, { position: { bottom: 0, right: 0 }, html: overlayHtml });
              overlayHtml
                .find(`#${workItem.elementId}_save`)
                .click((e: any) => {
                  const nodeId1 = e.target.id.slice(0, e.target.id.indexOf('_save'));
                  overlays.remove({ element: nodeId1 });

                  const children = e.target.parentElement.querySelectorAll('.form-control');
                  const values: Array<any> = [];
                  workItem.input.forEach((input: any) => {
                    children.forEach((child: any) => {
                      if (child.id === input.name) {
                        values.push(input.type === 'bool' ? child.checked : child.value);
                      }
                    });
                  });
                  this.http.post('http://localhost:3000' + workItem.hrefs[0], { elementId: workItem.elementId, inputParameters: values })
                    .subscribe(resp => this.http.get(this.url).subscribe(resp1 => this.renderState(resp1.json())));
                });
              overlayHtml.find(`#${workItem.elementId}_cancel`).click((e1: any) => {
                overlays.remove({ element: workItem.elementId });
              });
            }
        } else if (workItem.elementId === nodeId && workItem.hrefs.length > 1) {
          const toDisplay = [];
          for (let i = 0; i < workItem.hrefs.length; i++) {
              toDisplay.push(workItem.hrefs[i]);
          }
          if (toDisplay.length > 0) {
            const overlayHtml = jQuery(href_list_as_dropdown_menu({ nodeId: nodeId, hrefList: toDisplay }));
            overlays.add(nodeId, { position: { bottom: 0, right: 0 }, html: overlayHtml });
            overlayHtml.click((e1: any) => {
              const nodeId1 = e1.target.id.split(';')[0];
              const href = e1.target.text;
              overlays.remove({ element: nodeId1 });
              this.canvas.removeMarker(nodeId1, 'highlight');
              this.canvas.addMarker(nodeId1, 'highlight-running');
              const values: Array<any> = [];
              this.http.post('http://localhost:3000' + href, { elementId: workItem.elementId, inputParameters: values })
                .subscribe(resp => this.http.get(this.url).subscribe(resp1 => this.renderState(resp1.json())));
            });
            overlayHtml.toggle();
          }
        }
      }
      /*
      this.previousState.externalItemGroupList.forEach(externalItemGroup => {
        if (externalItemGroup.elementId === nodeId) {
          const toDisplay = [];
          for (let i = 0; i < externalItemGroup.status.length; i++) {
              toDisplay.push(externalItemGroup.hrefs[i]);
          }
          if (toDisplay.length > 0) {
            const overlayHtml = jQuery(href_list_as_dropdown_menu({ nodeId: nodeId, hrefList: toDisplay }));
            overlays.add(nodeId, { position: { bottom: 0, right: 0 }, html: overlayHtml });
            overlayHtml.click((e1: any) => {
              // this.processStorage.modelId = e.element.businessObject.name;
              // this.processStorage.actInst = e1.target.innerText;
              // this.router.navigateByUrl('/viewer');
            });
            overlayHtml.toggle();
          }
        }
      }); */
    });
  }

  ngOnInit(): void {
    this.viewer = new Viewer({ container: '#canvas' });
    this.canvas = this.viewer.get('canvas');
    this.updateContracts();
    this.setupListeners();

    /////////////////////////// Start //////////////////////////////////////
/*
    this.connection = this.getMessages().subscribe(message => {
      this.loadModel();
      console.log('Message from Server ...');
    });
*/
    //////////////////////////// End //////////////////////////////////////

  }

  ////////////////////////// Start ///////////////////////////

/*
  getMessages() {
    const observable = new Observable(observer => {
      this.socket = io(this.sURL);
      this.socket.on('message', (data) => {
        observer.next(data);
      });
      return () => {
        this.socket.disconnect();
      };
    });
    return observable;
  }
*/

  // tslint:disable-next-line:use-life-cycle-interface
  ngOnDestroy() {

  }



  /////////////////////// End //////////////////////////////

}
