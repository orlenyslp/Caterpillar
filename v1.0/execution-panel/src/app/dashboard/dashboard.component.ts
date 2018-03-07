import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Http } from '@angular/http';
import { element } from 'protractor';
import { ProcessStorage } from '../data-store/data-store';
import * as Viewer from 'bpmn-js/lib/Viewer';

declare function require(name: string);

const jQuery = require('jquery');
const Prism = require('prismjs');

@Component({
  selector: 'dashboard',
  templateUrl: './dashboard.component.html'
})
export class DashboardComponent {

  toSearch = '';


  constructor(private router: Router, public processStorage: ProcessStorage) {
    this.searchElement();
  }

  drawModel(proc: any) {
    let viewer = new Viewer({ container: '#proc.id' + '_canvas' });
    let canvas = viewer.get('#proc.id' + '_canvas');
    viewer.importXML(proc.bpmn, (definitions) => { })
  }

  openModeler() {
    this.router.navigateByUrl('/modeler');
  }
  openViewer(procName, instance) {
    this.processStorage.modelId = procName;
    this.processStorage.actInst = instance;
    this.router.navigateByUrl('/viewer');
  }

  searchElement() {
    this.processStorage.searchRegisteredModel(this.toSearch);
  }

  updateInstances(proc) {
    this.processStorage.updateInstances(proc);
  }

  getSolidity(proc) {
    return Prism.highlight(proc.solidity, Prism.languages.javascript);
  }
}
