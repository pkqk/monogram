require 'bundler/setup'
require 'sinatra'
require 'rest-client'

code = ENV['DIRECT_PRINT_CODE']
direct_print = "http://remote.bergcloud.com/playground/direct_print/#{code}"

get '/' do
  erb :snap
end

post '/' do
  img = params[:img]
  html = <<HTML
<html>
<style>
body { margin; 0; padding: 0; }
img { padding: 16px; border: 4px dashed black; margin: 21px; }
</style>
<img src="#{img}">
</html>
HTML
  RestClient.post(direct_print, :html => html)
  status 204
  ''
end
