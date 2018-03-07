import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Http } from '@angular/http';
import * as Modeler from 'bpmn-js/lib/Modeler.js';
import * as propertiesPanelModule from 'bpmn-js-properties-panel';
import * as propertiesProviderModule from 'bpmn-js-properties-panel/lib/provider/bpmn';
import { ProcessStorage } from 'app/data-store/data-store';

import { PaletteProvider } from './palette';
import { CustomPropertiesProvider } from './props-provider';

const fs = require('fs');
const async = require('async');

const customPaletteModule = {
  paletteProvider: ['type', PaletteProvider]
};

const customPropertiesProviderModule = {
  __init__: ['propertiesProvider'],
  propertiesProvider: ['type', CustomPropertiesProvider]
};

@Component({
  selector: 'modeler',
  styleUrls: ['./modeler.component.css'],
  templateUrl: './modeler.component.html'
})

export class ModelerComponent implements OnInit {
  modeler: any;

  modelText: string;

  goTo: boolean;

  constructor(private router: Router, private processStorage: ProcessStorage) { }

  ngOnInit() {
    this.processStorage.resetModel();
    this.modeler = new Modeler({
      container: '#canvas',
      additionalModules: [
        propertiesPanelModule,
        propertiesProviderModule,
        customPropertiesProviderModule,
        customPaletteModule
      ],
      propertiesPanel: {
        parent: '#js-properties-panel'
      }
    });
    this.modeler.importXML(this.processStorage.model, (error, definitions) => {
    });
  }

  openFile(event) {
    const input = event.target;
    for (let index = 0; index < input.files.length; index++) {
      const reader = new FileReader();
      reader.onload = () => {
        this.processStorage.model = reader.result;
        this.modeler.importXML(this.processStorage.model, (error, definitions) => {
        });
      };
      reader.readAsText(input.files[index]);
    }
  }

  validateName() {
    this.modeler.saveXML({ format: true },
      (err: any, xml: string) => {
        if (this.processStorage.hasModel(this.modeler.definitions.rootElements[0].id)) {
          this.modelText = 'The selected ID exists on the Workspace. Please, change this value and try again.';
          this.goTo = false;
        } else if (!this.modeler.definitions.rootElements[0].name || this.modeler.definitions.rootElements[0].name === '') {
          this.modelText = 'The Name of the model cannot be empty. Please, update this value and try again.';
          this.goTo = false;
        } else {
          this.goTo = true;
          this.processStorage.modelId = this.modeler.definitions.rootElements[0].id;
          this.processStorage.registerModel(xml);
          this.modelText = 'Working in Model Registration. Please, take into account that this may require some seconds.';
        }
      }
    );
  }

  goToDashborad() {
    if (this.goTo) {
      this.goTo = false;
      this.router.navigateByUrl('/dashboard');
    }
  }

}
