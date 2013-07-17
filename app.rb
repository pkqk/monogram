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
  html = erb :polaroid, :locals => { :img => img }
  RestClient.post(direct_print, :html => html)
  status 204
  ''
end
