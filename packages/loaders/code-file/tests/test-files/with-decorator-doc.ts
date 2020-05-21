import { Component, Input, Optional, ChangeDetectorRef } from '@angular/core';
import gql from 'graphql-tag';

const query = gql`
  query Users {
    users { name }
  }
`;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  @Input() foo: any;
  constructor(@Optional() cd: ChangeDetectorRef) { }
}
