#!/bin/bash

#Default. Over-ridden by value in config.py, config_dist.py if found
MAX_CHANNELS=10

PKT_SIZE=500

declare -g uuids=(
    0d77b5a0-4e76-464b-8085-e7d1c135d54a
    661e0314-cae6-498f-ac5d-3da56126304a
    00ee1ce9-4d4d-49d1-a8d8-df1efaaf56c5
    16f8cab1-59f4-41a0-a411-03914653010d
    fbbe2b53-b577-40ea-a5f8-a4a4f2bc7e49
    3492d328-6fff-4a5d-91b1-5dd7069dc1bd
    401020ff-c2f4-44b5-a5b8-805210b18225
    a8e80e16-5112-41a0-ad2a-ea47acc09a07
    afe01c30-a896-4751-9c3e-da5b237e10d5
    3e1e3847-d0eb-46e4-87c2-9343c8c7aa6b
    32edb391-024d-4c98-a0d5-5f39fb4108c0
    71af644c-be08-43ea-93e6-592f5f7ad391
    fa476390-27c9-4c0f-ab9a-1fd9754db03e
    2129a0f1-2ba9-4e3c-a199-215f8d28f5fb
    cd6f6aa8-f85d-4c9a-826e-358c8585062b
    3eac8664-24ac-4c50-8c08-3a03b203ea0d
    c8fce5d8-b645-46dd-98a0-343092caf277
    3472ada6-c092-4d1e-a3f7-76385a81c738
    481c46d3-87ca-497f-8d10-87257a322138
    1f3544d0-8cd9-4863-8dff-9eb5eff297de
    857624ff-dbd4-4976-bcc4-6b941c06376e
    ba2eca1c-0501-4090-85dc-09f3f1c19d38
    a5a8d88d-b5ae-4dfc-a78e-d939266942cb
    a590e43d-72ce-4d2f-8901-90641a51fe09
    ea0f7a44-580b-4a77-a578-c7303298ffd7
    baf540de-7b14-4402-b160-ebc106f1e046
    90d9645a-ee13-4d82-8390-bee3ef138cb0
    ce3133c1-9da4-41e5-8efa-0e6d3d45f186
    65627026-a688-46af-b2a4-43fd26d1c1d6
    920a1512-2d65-40fd-84e1-291580d2c070
)

send_audio () {
    local channel freq quality bitrate
    channel=$1
    freq=$2
    quality=$3

    declare -a bitrates=(6600 8850 12650 14250 15850 18250 19850 23050 23850)
        
    bitrate=${bitrates[quality]}
    

    $FFMPEG -re -f lavfi -i "sine=frequency=$freq:sample_rate=16000" -c:a libvo_amrwbenc -b:a $bitrate -f rtp rtp://@228.227.226.$(( 225 + channel )):1234?pkt_size=$PKT_SIZE
}

send_uuid () {
    local channel set uuid_index
    channel=$1
    set=$2
    
    uuid_index=$(( channel + (MAX_CHANNELS * set) ))
    
    touch /tmp/$( basename "$0" ).run
    
    while [ -f /tmp/$( basename "$0" ).run ]; do echo -n "TX${uuids[uuid_index]}" | socat - UDP:228.227.227.$(( 225 + channel )):1234; sleep 1; done
}

stop_all () {
    if ps aux | grep "ffmpeg" | grep -q "libvo_amrwbenc"; then
        kill -KILL $( ps aux | grep "ffmpeg" | grep "libvo_amrwbenc" | awk '{print $2}' )
    fi
    rm -f /tmp/$( basename "$0" ).run
}

cleanup () {
    stop_all
    
    trap - SIGINT
    exit
}

function get_num_chans () {
    [ -f $1 ] && grep -E "^[^#]*MAX_CHANNELS" "$1" | grep -oE "[0-9]+[[:space:]]*$"
}

FFMPEG=ffmpeg
if [[ -f "/usr/local/bin/ffmpeg-static" ]]; then
    FFMPEG="/usr/local/bin/ffmpeg-static"
fi

trap cleanup SIGINT

stop_all

if [[ "$1" == "stop" ]]; then
  cleanup
fi

if [ -f "config.py" ]; then
    MAX_CHANNELS=$( get_num_chans "config.py" )
else
    if [ -f "config_dist.py" ]; then
        MAX_CHANNELS=$( get_num_chans "config_dist.py" )
    fi
fi

setnum=0
if echo "$1" | grep -Eq "^[0-2]$"; then
  setnum=$1
  echo "Set number $setnum"
fi

for (( i=0; i<$MAX_CHANNELS; i++ )); do
    send_audio $i $(( 432 + (i * 100) )) $(( i % 9 )) &>/dev/null &
    send_uuid $i $setnum &>/dev/null &
done
