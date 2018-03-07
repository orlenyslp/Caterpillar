import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  template:
            '<router-outlet ></router-outlet>',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'app works!';
  code =
  // " public class Proc { public int method() {} }"
  'pragma solidity ^0.4.0;\ncontract BPMNProc { function () returns () { return; }}';
}
