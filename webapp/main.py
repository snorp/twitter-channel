#!/usr/bin/env python
#
# Copyright 2007 Google Inc.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#
from google.appengine.ext import webapp
from google.appengine.ext.webapp import util
from google.appengine.api.urlfetch import fetch

from django.utils import simplejson

class MainHandler(webapp.RequestHandler):
    def get(self):
        self.response.out.write('go away');

class ExpandHandler(webapp.RequestHandler):
    
    def __bail(self):
        self.response.status_code = 500
        self.response.out.write('Something went wrong')
    
    def get(self):
        self.response.headers['Content-Type'] = 'text/plain';
        
        short_url = self.request.get("shortUrl");
        if not short_url:
            self.__bail
            return
        
        response = fetch(short_url, method='HEAD', follow_redirects=False);
        if response.status_code != 301 or not response.headers['Location']:
            self.__bail
            return
        
        self.response.out.write(response.headers['Location']);

def main():
    application = webapp.WSGIApplication([('/', MainHandler), ('/expand_shorturl', ExpandHandler)],
                                         debug=True)
    util.run_wsgi_app(application)


if __name__ == '__main__':
    main()
