#! /usr/bin/env perl
###################################################
#
#  Copyright (C) 2013 Max Jonas Werner <mail@makk.es>
#  
#  based on original code by:
#
#  Copyright (C) 2010-2011 Mario Kemper <mario.kemper@googlemail.com> and Shutter Team
#
#  This is free software; you can redistribute it and/or modify
#  it under the terms of the GNU General Public License as published by
#  the Free Software Foundation; either version 3 of the License, or
#  (at your option) any later version.
#
#  This plugin is distributed in the hope that it will be useful,
#  but WITHOUT ANY WARRANTY; without even the implied warranty of
#  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
#  GNU General Public License for more details.
#
#  You should have received a copy of the GNU General Public License
#  along with this plugin; if not, write to the Free Software
#  Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA  02111-1307  USA
#
###################################################

package Fileboy;

use lib $ENV{'SHUTTER_ROOT'}.'/share/shutter/resources/modules';

use utf8;
use strict;
use POSIX qw/setlocale/;
use Locale::gettext;
use Glib qw/TRUE FALSE/; 

use Shutter::Upload::Shared;
our @ISA = qw(Shutter::Upload::Shared);

my $d = Locale::gettext->domain("shutter-upload-plugins");
$d->dir( $ENV{'SHUTTER_INTL'} );

my %upload_plugin_info = (
    'module'        => "Fileboy",
	'url'           => "https://github.com/makkes/fileboy/",
	'description'   => $d->get( "Fileboy provides safe file hosting" ),
	'supports_anonymous_upload'  => FALSE,
	'supports_authorized_upload' => TRUE,
);

binmode( STDOUT, ":utf8" );
if ( exists $upload_plugin_info{$ARGV[ 0 ]} ) {
	print $upload_plugin_info{$ARGV[ 0 ]};
	exit;
}

###################################################

sub new {
	my $class = shift;

	#call constructor of super class (host, debug_cparam, shutter_root, gettext_object, main_gtk_window, ua)
	my $self = $class->SUPER::new( shift, shift, shift, shift, shift, shift );

	bless $self, $class;
	return $self;
}

sub init {
	my $self = shift;

	#do custom stuff here
	use LWP::UserAgent;
	use HTTP::Request::Common;
	
	return TRUE;
}

sub upload {
	my ( $self, $upload_filename, $username, $password ) = @_;

	#store as object vars
	$self->{_filename} = $upload_filename;
	$self->{_username} = $username;
	$self->{_password} = $password;

	utf8::encode $upload_filename;
	utf8::encode $password;
	utf8::encode $username;

	#~ if ( $username ne "" && $password ne "" ) {

		my $client = LWP::UserAgent->new(
			'timeout'    => 20,
			'keep_alive' => 10,
			'env_proxy'  => 1,
		);

		eval{

			my %params = (
				'file' => [$upload_filename],
			);

			my @params = (
				"https://fileboy.makk.es/upload",
				'Content_Type' => 'multipart/form-data',
				'Content' => [%params]
			);
			
			my $req = HTTP::Request::Common::POST(@params);
			push @{ $client->requests_redirectable }, 'POST';
                        $req->authorization_basic($username, $password);
			my $rsp = $client->request($req);
                        print $rsp;

                        if($rsp->is_success) {
                            my $file_url = $rsp->content;
                            $self->{_links}{'direct_link'} = $file_url;
                            $self->{_links}{'status'} = 200;
                            if( $self->{_debug_cparam}) { 
                                print $file_url;
                            }
			}else{
				$self->{_links}{'status'} = "Error: " . $rsp->status_line;
			}
    
		};

	#~ }else{
		#~ 
	#~ }
	
	#and return links
	return %{ $self->{_links} };
}

1;
