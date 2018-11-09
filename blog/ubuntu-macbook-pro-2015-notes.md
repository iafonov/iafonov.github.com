---
title: Running Ubuntu 18.04 + i3 on Macbook Pro 2015
layout: post
---

# Running Ubuntu 18.04 + i3 on Macbook Pro 2015

<div class="date">[9 Nov 2018]</div>

Everything works surpisingly well. No issues with graphics, power management or
missing features.

### Full disk encryption with preserving dual boot to OS X

Just follow [this awesome guide step by
step](https://blog.jayway.com/2015/11/22/ubuntu-full-disk-encrypted-macosx/).
Dual boot works fine. Both OS X and Linux partitions are encrypted.

### i3 quirks

Seems like everything works out of the box in Gnome. i3 requires some manual
things to do to make it run fine. I'm too lazy to setup hotkeys for screen
brightness and keyboard backlight and adjust them manually.

### HiDPI

```bash
$ echo "Xft.dpi: 192" > ~/.Xresources
```

### Screen brightness

```bash
$ xrandr --output eDP --brightness 0.75
```

### Keyboard backlight

```bash
$ sudo vim /sys/class/leds/smc::kbd_backlight/brightness
```

### Volume control via media keys i3 config

```bash
bindsym XF86AudioRaiseVolume exec pactl set-sink-volume @DEFAULT_SINK@ +10%; exec pactl set-sink-mute @DEFAULT_SINK@ 0
bindsym XF86AudioLowerVolume exec pactl set-sink-volume @DEFAULT_SINK@ -10%; exec pactl set-sink-mute @DEFAULT_SINK@ 0
bindsym XF86AudioMute exec pactl set-sink-mute @DEFAULT_SINK@ toggle
```

### Wifi and bluetooth applets

```bash
exec blueman-applet
exec nm-applet
```

Enjoy!

 <img style="padding-bottom: 15px; padding-top: 15px; width: 800px" src="/images/i3.png">

<br/>
